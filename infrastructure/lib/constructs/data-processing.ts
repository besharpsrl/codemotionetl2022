import { Duration } from 'aws-cdk-lib';
import {Construct} from 'constructs';
import {Bucket, BucketEncryption, BucketAccessControl, BlockPublicAccess} from 'aws-cdk-lib/aws-s3';
import {environment} from "../../environment";
import {Cluster} from "@aws-cdk/aws-redshift-alpha"
import {IVpc, ISubnet, SecurityGroup, Peer, Port, } from "aws-cdk-lib/aws-ec2";
import {ISecret, Secret} from "aws-cdk-lib/aws-secretsmanager";
import { Role, ServicePrincipal, PolicyStatement, Effect, Policy, ManagedPolicy } from 'aws-cdk-lib/aws-iam';
import { Topic } from 'aws-cdk-lib/aws-sns';
import { LogGroup, RetentionDays } from "aws-cdk-lib/aws-logs";

import {Job, JobExecutable, GlueVersion, PythonVersion, WorkerType, Code, Connection, ConnectionType} from "@aws-cdk/aws-glue-alpha";

import { CfnStateMachine, StateMachine, Pass, IntegrationPattern, Chain, Parallel, Condition, Choice, Wait, Map, InputType, Fail } from 'aws-cdk-lib/aws-stepfunctions';
import { GlueStartJobRun, SnsPublish } from 'aws-cdk-lib/aws-stepfunctions-tasks';
import * as path from "path";


export interface DataProcessingProps {
    vpc: IVpc;
    subnets: { public: ISubnet[]; natted: ISubnet[]; private: ISubnet[]; };
    redshiftCluster: Cluster;
    redshiftDatabase: string;
    redshiftSG: SecurityGroup;
    redshiftSecret: ISecret;
    inputBucket: Bucket;
    outputBucket: Bucket;
    // inputPrefix: string;
    // inputDataStore: CfnDatastore;
    // imageOutputPrefix: string;
    // carDataOutputPrefix: string;
}

export class DataProcessing extends Construct {
    private readonly _inputBucket: Bucket;
    private readonly _transformedBucket: Bucket;
    private readonly _cluster: Cluster;
    private readonly _secret: Secret;

    constructor(scope: Construct, id: string, props: DataProcessingProps) {
        super(scope, id);

        // TODO:
        // - create glue connection (to RS) --> test-codemotion-rs
        // - glue code (double data sink)
        // - create and test crawler // forse non serve, lo fa già il job
        // - update SF with crawler
        // - athena + QS with table created by crawler

        // /* **********************
        //     Failure Handling
        // ************************* */
        const failureTopic = new Topic(this, 'FailureTopic', {
            topicName: `${environment.name}-${environment.project}-transformation-sf-failure-topic`,
            displayName: `${environment.name}-${environment.project}-transformation-sf-failure-topic`,
        });

        const failureStep = new SnsPublish(this, 'NotifyFailureStep', {
            topic: failureTopic,
            subject: `[Failure]: ${environment.name}-${environment.project}-transformation-sf`,
            // message: sfn.TaskInput.fromJsonPathAt('$.message'),
            message: {
                type: InputType.TEXT,
                value: `Failure during ${environment.name}-${environment.project}-transformation-sf Step Function`
            },
            // resultPath: '$.sns',
        }).next(new Fail(this, 'FailureStep', {
            // cause: '',
            error: `[Failure]: ${environment.name}-${environment.project}-transformation-sf`,
        }))

        // /* **********************
        //     Glue components
        // ************************* */
        const jobSG = new SecurityGroup(this, 'JobSG', {
            securityGroupName: `${environment.name}-${environment.project}-job-sg`,
            description: `${environment.name}-${environment.project}-job-sg`,
            vpc: props.vpc,
            allowAllOutbound: true
        });
        props.redshiftSG.addIngressRule(Peer.securityGroupId(jobSG.securityGroupId), Port.tcp(5439), 'Ingress from Glue Job')

        const jobLogGroup = new LogGroup(this, `JobLogGroup`, {
            logGroupName: `${environment.name}-${environment.project}-transformation-job`,
            retention: environment.name == 'prod' ? RetentionDays.INFINITE : RetentionDays.ONE_WEEK
        });

        const jobRole = new Role(this, 'JobRole', {
            roleName: `${environment.name}-${environment.project}-transformation-job-role`,
            description: `${environment.name}-${environment.project}-transformation-job-role`,
            assumedBy: new ServicePrincipal('glue.amazonaws.com')
        });
        // props.inputBucket.grantRead(jobRole)
        // props.outputBucket.grantReadWrite(jobRole)
        // TODO: policies
        jobRole.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName("AdministratorAccess"));

        const rsJobConnection = new Connection(this, 'RedshiftJobConnection', {
            type: ConnectionType.JDBC,
            connectionName: `${environment.name}-${environment.project}-redshift`,
            description: `${environment.name}-${environment.project}-redshift`,
            // matchCriteria: 44,
            properties: {
                "JDBC_ENFORCE_SSL": "false",
                // "JDBC_CONNECTION_URL": "jdbc:redshift://dev-codemotion-cdk-etl-cluster.cv4q3eaj360w.eu-west-1.redshift.amazonaws.com:5439/dev-codemotion-cdk-etl",
                "JDBC_CONNECTION_URL": `jdbc:redshift://${props.redshiftCluster.clusterEndpoint.socketAddress}/${props.redshiftDatabase}`, // "jdbc:redshift://dev-codemotion-cdk-etl-cluster.cv4q3eaj360w.eu-west-1.redshift.amazonaws.com:5439/dev-codemotion-cdk-etl",
                "SECRET_ID": props.redshiftSecret.secretName, // "dev-codemotion-cdk-etl-secret",
                "KAFKA_SSL_ENABLED": "false"
            },
            securityGroups: [jobSG],
            subnet: props.subnets.private[2],
        })

    
        const job = new Job(this, `Job`, {
            jobName: `${environment.name}-${environment.project}-transformation-job`,
            description: `${environment.name}-${environment.project}-transformation-job`,
            executable: JobExecutable.pythonEtl({
                glueVersion: GlueVersion.V3_0,
                pythonVersion: PythonVersion.THREE,
                script: Code.fromAsset(path.join(__dirname, '..', '..', '..', 'src', 'glue-jobs', 'transformer', 'job.py')),
            }),
            workerType: WorkerType.G_1X,
            workerCount: 10,
            maxConcurrentRuns: 1,
            connections: [ rsJobConnection ], // Todo connection to RS
            defaultArguments: {
              "--TempDir": `s3://aws-glue-assets-919788038405-eu-west-1/${environment.name}-${environment.project}/temp/`,
              "--enable-glue-datacatalog": "true",
              "--job-bookmark-option": "job-bookmark-enable",
              "--enable-job-insights": "true",
              "--enable-metrics": "true",
              "--class": "GlueApp",
              "--INPUT_BUCKET": props.inputBucket.bucketName,
              "--OUTPUT_BUCKET": props.outputBucket.bucketName // TODO: RS info
            },
            continuousLogging: {
                enabled: true,
                logGroup: jobLogGroup,
                logStreamPrefix: 'transformation-job',
                quiet: true,
            },
            role: jobRole,
            timeout: Duration.hours(2),
            maxRetries: 3,
        });


        // /* **********************
        //    SF Steps
        // ************************* */
        const transformationJobStep = new GlueStartJobRun(this, 'transformationJobStep', {
            glueJobName: job.jobName,
            // arguments: {},
            integrationPattern: IntegrationPattern.RUN_JOB,
            // inputPath: '',
            // outputPath: '',
        }).addRetry({maxAttempts: 5}).addCatch(failureStep, {
            // resultPath:
        });;

        // /* **********************
        //    SF Definition
        // ************************* */
        const transformationSfRole = new Role(this, 'TransformationSfRole', {
            roleName: `${environment.name}-${environment.project}-transformation-sf-role`,
            description: `${environment.name}-${environment.project}-transformation-sf-role`,
            assumedBy: new ServicePrincipal('states.amazonaws.com')
        });
        // failureTopic.grantPublish(transformationSfRole) and invoke glue
        transformationSfRole.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName("AdministratorAccess"));


        // TODO:
        // const definition = crawlerStep.next(transformationJobStep);
        const definition = transformationJobStep;

        const paidMediaSf  = new StateMachine(this, 'PaidMediaSf', {
            stateMachineName: `${environment.name}-${environment.project}-transformation`,
            definition: definition,
            role: transformationSfRole
        });

    }

}
