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
    private readonly _inputBucket: Bucket;
    private readonly _failureTopic: Topic;
    private readonly _transformedBucket: Bucket;

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

    }

    public get inputBucket(): Bucket {
        return this._inputBucket;
    }

    public get transformedBucket(): Bucket {
        return this._transformedBucket;
    }

}
