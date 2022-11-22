import {aws_lambda, Duration, Stack, StackProps, Stage, StageProps, Tags} from "aws-cdk-lib";
import {Construct} from "constructs";
import {environment} from "../environment";
import {DataStorage} from "./constructs/data-storage";
import {KinesisInput} from "./constructs/kinesis-input";
import {Vpc, IVpc, ISubnet, Subnet} from "aws-cdk-lib/aws-ec2";
import {LambdaLayersNestedStack} from "./nested/lambdalayers-stack";
import {LambdaDestination} from "aws-cdk-lib/aws-s3-notifications/lib/lambda";
import * as path from "path";
import {AssetCode, Runtime} from "aws-cdk-lib/aws-lambda";
import {ManagedPolicy, Role, ServicePrincipal} from "aws-cdk-lib/aws-iam";

export class InfrastructureStage extends Stage {
    constructor(scope: Construct, id: string, props: StageProps) {
        super(scope, id, props);
        const infrastructureStack = new InfrastructureStack(this, "BesharpCdkInfrastructureStack", {
            stackName: `${environment.name}-${environment.project}-infrastructure`,
            description: `Stack that contains the main infrastructure for the ${environment.name}-${environment.project} environment`,
            tags: {
                ProjectName: environment.project,
                Environment: environment.name,
            },
        });
    }
}


export class InfrastructureStack extends Stack {
    public vpc: IVpc;
    public publicSubnets: ISubnet[];

    private readonly lambdaLayersNestedStack: LambdaLayersNestedStack;
    private readonly dataStorage: DataStorage;
    private readonly kinesisInput: KinesisInput;

    constructor(scope: Construct, id: string, props: StackProps) {
        super(scope, id, props);

        /* **********************
            Networking
        ************************* */
        this.vpc = Vpc.fromLookup(this, `${id}VPC`, {
            vpcId: environment.vpcId,
        });

        this.publicSubnets= [
            Subnet.fromSubnetId(this, 'SubnetPublicA', environment.subnetPublic)
        ];

        /* **********************
            Stacks
        ************************* */
        this.lambdaLayersNestedStack = new LambdaLayersNestedStack(this, "LambdaLayersNestedStack", {})

        // TODO: create RS
        this.dataStorage = new DataStorage(this, 'DataStorage', {});
        const synchRedshiftFunctionRole = new Role(this, `SynchRedshiftFunctionRole`, {
            roleName: `${environment.name}-${environment.project}-synch-redshift-role`,
            description: '',
            assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
            managedPolicies: [
                ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaBasicExecutionRole"),
            ],
        })
        const synchRedshiftFunction = new aws_lambda.Function(this, "SynchRedshiftFunction", {
            functionName: `${environment.name}-${environment.project}-synch-redshift`,
            handler: 'handler.handler',
            code: aws_lambda.Code.fromAsset(path.join('..','..','src','lambda','synch-redshift')),
            runtime: aws_lambda.Runtime.PYTHON_3_9,
            memorySize: 512,
            timeout: Duration.minutes(3),
            layers: this.lambdaLayersNestedStack.layers,
            role: synchRedshiftFunctionRole,
        })
        this.dataStorage.transformedBucket.addObjectCreatedNotification(new LambdaDestination(synchRedshiftFunction))

        this.kinesisInput = new KinesisInput(this, 'KinesisInput', {
            inputBucket: this.dataStorage.inputBucket
        });

        // Crawler su transformed bucket

        

    }
}
