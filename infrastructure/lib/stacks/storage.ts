import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import {environment} from "../../environment";

export class StorageStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const inputBucket = new s3.Bucket(this, 'InputBucket', {
      bucketName: `${environment.name}-${environment.project}-input`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      versioned: true,
      accessControl: s3.BucketAccessControl.PRIVATE,
      blockPublicAccess: new s3.BlockPublicAccess(s3.BlockPublicAccess.BLOCK_ALL)
    });

    const transformedBucket = new s3.Bucket(this, 'TransformedBucket', {
      bucketName: `${environment.name}-${environment.project}-processed`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      versioned: true,
      accessControl: s3.BucketAccessControl.PRIVATE,
      blockPublicAccess: new s3.BlockPublicAccess(s3.BlockPublicAccess.BLOCK_ALL)
    });
  }
}
