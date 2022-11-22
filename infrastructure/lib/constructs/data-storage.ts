import * as cdk from 'aws-cdk-lib';
import {Construct} from 'constructs';
import {Bucket, BucketEncryption, BucketAccessControl, BlockPublicAccess} from 'aws-cdk-lib/aws-s3';
import {environment} from "../../environment";
import {Cluster} from "@aws-cdk/aws-redshift-alpha"
import {IVpc} from "aws-cdk-lib/aws-ec2";
import {Secret} from "aws-cdk-lib/aws-secretsmanager";

export interface DataStorageProps {
    vpc: IVpc;
    // subnets: ISubnet[];
    // merakiSecret: Secret;
    // inputBucket: Bucket;
    // inputPrefix: string;
    // inputDataStore: CfnDatastore;
    // imageOutputPrefix: string;
    // carDataOutputPrefix: string;
}

export class DataStorage extends Construct {
    private readonly _inputBucket: Bucket;
    private readonly _transformedBucket: Bucket;
    private readonly _cluster: Cluster;
    private _secret: Secret;

    constructor(scope: Construct, id: string, props: DataStorageProps) {
        super(scope, id);

        this._inputBucket = new Bucket(this, 'InputBucket', {
            bucketName: `${environment.name}-${environment.project}-input`,
            encryption: BucketEncryption.S3_MANAGED,
            versioned: true,
            accessControl: BucketAccessControl.PRIVATE,
            blockPublicAccess: new BlockPublicAccess(BlockPublicAccess.BLOCK_ALL)
        });

        this._transformedBucket = new Bucket(this, 'TransformedBucket', {
            bucketName: `${environment.name}-${environment.project}-processed`,
            encryption: BucketEncryption.S3_MANAGED,
            versioned: true,
            accessControl: BucketAccessControl.PRIVATE,
            blockPublicAccess: new BlockPublicAccess(BlockPublicAccess.BLOCK_ALL)
        });

        this._secret = new Secret(this, 'Secret', {
            secretName: `${environment.name}-${environment.project}-secret`,
            generateSecretString: {
                secretStringTemplate: JSON.stringify({
                    username: 'admin',
                    host: '',
                    dbname: `${environment.name}-${environment.project}`,
                }),
                generateStringKey: 'password',
                excludeCharacters: '/@" '
            },
        });

        this._cluster = new Cluster(this, 'Cluster', {
            masterUser: {
                masterUsername: 'admin',
                masterPassword: cdk.SecretValue.secretsManager(this._secret.secretArn, {jsonField: 'password'}),
            },
            vpc: props.vpc,
            clusterName: `${environment.name}-${environment.project}-cluster`,
            defaultDatabaseName: `${environment.name}-${environment.project}`,
        });


    }

    public get inputBucket(): Bucket {
        return this._inputBucket;
    }

    public get transformedBucket(): Bucket {
        return this._transformedBucket;
    }

}
