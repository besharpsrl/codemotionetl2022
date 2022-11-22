import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {Bucket, BucketEncryption, BucketAccessControl, BlockPublicAccess} from 'aws-cdk-lib/aws-s3';
import {environment} from "../../environment";

export interface DataStorageProps {
  // vpc: IVpc;
  // subnets: ISubnet[];
  // merakiSecret: Secret;
  // inputBucket: Bucket;
  // inputPrefix: string;
  // inputDataStore: CfnDatastore;
  // imageOutputPrefix: string;
  // carDataOutputPrefix: string;
}

export class DataStorage extends Construct {
  private inputBucket: Bucket;
  private transformedBucket: Bucket;

  constructor(scope: Construct, id: string, props: DataStorageProps) {
    super(scope, id);

    this.inputBucket = new Bucket(this, 'InputBucket', {
      bucketName: `${environment.name}-${environment.project}-input`,
      encryption: BucketEncryption.S3_MANAGED,
      versioned: true,
      accessControl: BucketAccessControl.PRIVATE,
      blockPublicAccess: new BlockPublicAccess(BlockPublicAccess.BLOCK_ALL)
    });

    this.transformedBucket = new Bucket(this, 'TransformedBucket', {
      bucketName: `${environment.name}-${environment.project}-processed`,
      encryption: BucketEncryption.S3_MANAGED,
      versioned: true,
      accessControl: BucketAccessControl.PRIVATE,
      blockPublicAccess: new BlockPublicAccess(BlockPublicAccess.BLOCK_ALL)
    });
  }

  public get rawDataBucket() : Bucket {
    return this.inputBucket;
  }
}
