import * as cdk from 'aws-cdk-lib';
import {Construct} from 'constructs';
import {Bucket, BucketEncryption, BucketAccessControl, BlockPublicAccess, EventType} from 'aws-cdk-lib/aws-s3';
import {environment} from "../../environment";
import {Vpc, IVpc, ISubnet, Subnet, SecurityGroup} from "aws-cdk-lib/aws-ec2";
import {Cluster, ClusterType, NodeType, ClusterParameterGroup, ClusterSubnetGroup} from "@aws-cdk/aws-redshift-alpha"
import {ISecret, Secret} from "aws-cdk-lib/aws-secretsmanager";
import { Topic } from "aws-cdk-lib/aws-sns";
import { SnsDestination } from "aws-cdk-lib/aws-s3-notifications";
import { Role, ServicePrincipal, ManagedPolicy } from 'aws-cdk-lib/aws-iam';


export interface DataStorageProps {
    vpc: IVpc;
    subnets: { public: ISubnet[]; natted: ISubnet[]; private: ISubnet[]; };
}

export class DataStorage extends Construct {
    private readonly _masterUsername: string = 'admin';
    private readonly _defaultDB: string = `${environment.name}-${environment.project}`;
    private readonly _inputBucket: Bucket;
    private readonly _failureTopic: Topic;
    private readonly _transformedBucket: Bucket;
    private readonly _clusterSg: SecurityGroup;
    private readonly _cluster: Cluster;
    private readonly _secret: Secret;

    constructor(scope: Construct, id: string, props: DataStorageProps) {
        super(scope, id);

        this._inputBucket = new Bucket(this, 'InputBucket', {
            bucketName: `${environment.name}-${environment.project}-input`,
            encryption: BucketEncryption.S3_MANAGED,
            versioned: true,
            accessControl: BucketAccessControl.PRIVATE,
            blockPublicAccess: new BlockPublicAccess(BlockPublicAccess.BLOCK_ALL)
        });

        this._failureTopic = new Topic(this, 'InputFailureTopic', {
            topicName: `${environment.name}-${environment.project}-transformation-input-failure-topic`,
            displayName: `${environment.name}-${environment.project}-transformation-input-failure-topic`,
        });
        this._inputBucket.addEventNotification(EventType.OBJECT_CREATED, new SnsDestination(this._failureTopic), {prefix: 'failed_data/'})

        this._transformedBucket = new Bucket(this, 'TransformedBucket', {
            bucketName: `${environment.name}-${environment.project}-processed`,
            encryption: BucketEncryption.S3_MANAGED,
            versioned: true,
            accessControl: BucketAccessControl.PRIVATE,
            blockPublicAccess: new BlockPublicAccess(BlockPublicAccess.BLOCK_ALL)
        });

        const rsRole = new Role(this, 'JobRole', {
            roleName: `${environment.name}-${environment.project}-redshift-role`,
            description: `${environment.name}-${environment.project}-redshift-role`,
            assumedBy: new ServicePrincipal('redshift.amazonaws.com')
        });
        rsRole.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName("AdministratorAccess"));


        this._secret = new Secret(this, 'Secret', {
            secretName: `${environment.name}-${environment.project}-secret`,
            generateSecretString: {
                secretStringTemplate: JSON.stringify({
                    username: this._masterUsername,
                    host: '',
                    dbname: `${environment.name}-${environment.project}`,
                }),
                generateStringKey: 'password',
                excludeCharacters: '/@" '
            },
        });

        this._clusterSg = new SecurityGroup(this, 'ClusterSG', {
            securityGroupName: `${environment.name}-${environment.project}-rs-sg`,
            description: `${environment.name}-${environment.project}-rs-sg`,
            vpc: props.vpc,
            allowAllOutbound: true
        });

        const subnetGroup = new ClusterSubnetGroup(this, 'SubnetGroup', {
            description: `${environment.name}-${environment.project}-cluster-subnet-group`,
            vpc: props.vpc,
            vpcSubnets: {subnets: props.subnets.private}
        })

        const parameterGroup = new ClusterParameterGroup(this, 'ParameterGroup', {
            description: `${environment.name}-${environment.project}-cluster-param-group`,
            parameters: {}
        })

        this._cluster = new Cluster(this, 'Cluster', {
            clusterName: `${environment.name}-${environment.project}-cluster`,
            defaultDatabaseName: this._defaultDB,
            masterUser: {
                masterUsername: this._masterUsername,
                masterPassword: cdk.SecretValue.secretsManager(this._secret.secretArn, {jsonField: 'password'}),
            },
            roles: [rsRole],
            parameterGroup: parameterGroup,
            subnetGroup: subnetGroup,
            securityGroups: [this._clusterSg],
            vpc: props.vpc,
        });


    }

    public get inputBucket(): Bucket {
        return this._inputBucket;
    }

    public get transformedBucket(): Bucket {
        return this._transformedBucket;
    }

    public get cluster(): Cluster {
        return this._cluster;
    }

    public get clusterDB(): string {
        return this._defaultDB;
    }

    public get clusterSecret(): ISecret {
        return this._secret;
    }

    public get clusterSG(): SecurityGroup {
        return this._clusterSg;
    }

}
