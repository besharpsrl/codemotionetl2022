import { Duration, Stack, NestedStack, RemovalPolicy } from "aws-cdk-lib";
import { Construct } from 'constructs';
import {
  Bucket,
} from 'aws-cdk-lib/aws-s3';
import {Effect, ManagedPolicy, PolicyStatement, Role, ServicePrincipal, PolicyDocument} from "aws-cdk-lib/aws-iam";
import { LogGroup } from "aws-cdk-lib/aws-logs";
import { Function, Runtime, AssetCode } from 'aws-cdk-lib/aws-lambda';
import {Stream, StreamMode, StreamEncryption} from 'aws-cdk-lib/aws-kinesis';
import { CfnDeliveryStream } from "aws-cdk-lib/aws-kinesisfirehose";
import { DeliveryStream, DestinationBindOptions, DestinationConfig, IDestination, StreamEncryption as FirehoseStreamEncryption } from "@aws-cdk/aws-kinesisfirehose-alpha";
import { Database, Table, Schema, InputFormat, OutputFormat, SerializationLibrary, ClassificationString } from "@aws-cdk/aws-glue-alpha";
import {environment} from "../../environment";

export interface KinesisInputProps {
  // vpc: IVpc;
  // subnets: ISubnet[];
  inputBucket: Bucket;
  // outputBucket: Bucket;
}

export class S3CustomDestination implements IDestination {

  constructor(private options: CfnDeliveryStream.ExtendedS3DestinationConfigurationProperty) {}

  public bind(scope: Construct, options: DestinationBindOptions): DestinationConfig {

      return {
          extendedS3DestinationConfiguration: this.options
      }
  }

}

export class KinesisInput extends Construct {
  constructor(scope: Construct, id: string, props: KinesisInputProps) {
    super(scope, id);

    const region = Stack.of(this).region;
    const accountId = Stack.of(this).account;

    /* **********************
        Data Stream
    ************************* */
    const dataStream = new Stream(this, 'InputDataStream', {
      streamName: `${environment.name}-${environment.project}-data-stream`,
      encryption: StreamEncryption.MANAGED,
      streamMode: StreamMode.ON_DEMAND,
    });


    // const dedupTable = new DynamoTable(this, `${COUNTRY_PREFIX}EventsTable`, {
    //   tableName: `${props.prefix}-self-registration-events-table`,
    //   billingMode: BillingMode.PAY_PER_REQUEST,
    //   partitionKey: {name: 'submission_id', type: AttributeType.STRING},
    //   sortKey: {name: 's3_key', type: AttributeType.STRING}, //obj_key
    //   pointInTimeRecovery: true,
    //   removalPolicy: RemovalPolicy.DESTROY
    // });

    /* **********************
        Log group, processIAM role
    ************************* */
    const deliveryStreamLogGroup = new LogGroup(this, `deliveryStreamLogGroup`, {
      logGroupName: `${environment.name}-${environment.project}-delivery-stream`
    });

    /* **********************
        Glue DB and table
    ************************* */
    const glueDatabase = new Database(this, `GlueDatabase`, {
      databaseName: `${environment.name}-${environment.project}`,
    });

    const inputTable =  new Table(this, `InputTable`, {
      database: glueDatabase,
      tableName: `${environment.name}-${environment.project}-raw-data`,
      description: `${environment.name}-${environment.project}-raw-data`,
      columns: [
          { name: 'id', type: Schema.STRING, },
          { name: 'stock_name', type: Schema.STRING, },
          { name: 'price', type: Schema.DOUBLE, },
          { name: 'ts', type: Schema.BIG_INT, },
      ],
      dataFormat: {
          inputFormat: InputFormat.TEXT,
          outputFormat: OutputFormat.PARQUET,
          serializationLibrary: SerializationLibrary.PARQUET,
          classificationString: ClassificationString.PARQUET
      },
      compressed: false,
      bucket: props.inputBucket,
      s3Prefix: 'raw_data/'
    });

  /* **********************
      Processor
  ************************* */
  const validatorLambdaRole = new Role(this, `validatorLambdaRole`, {
    roleName: `${environment.name}-${environment.project}-validator-role`,
    description: 'IAM Role validator lambda',
    assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
    managedPolicies: [
        ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaBasicExecutionRole"),
    ],
  })
  // dedupTable.grantReadWriteData(this.validatorLambdaRole) // for deduplication

  const validatorLambda = new Function(this, `validatorLambda`, {
      functionName: `${environment.name}-${environment.project}-validator`,
      description: `${environment.name}-${environment.project}-validator`,
      environment: {
          ENV: environment.name,
          LOG_LEVEL: environment.name == 'dev' ? "20" : "40",
          // DEDUP_TABLE: dedupTable.tableName
      },
      handler: 'index.lambda_handler',
      runtime: Runtime.PYTHON_3_9,
      role: validatorLambdaRole,
      code: new AssetCode('src/lambdas/validator/'),
      memorySize: 256,
      timeout: Duration.minutes(3),
      // onFailure: new lambdaSNSDestination(kinesisLambdaFailureTopic),
  })

  /* **********************
      Firehose
  ************************* */
  const firehosePolicyDocument = new PolicyDocument({
    statements: [
        new PolicyStatement({
            effect: Effect.ALLOW,
            resources: [ deliveryStreamLogGroup.logGroupArn  ],
            actions: [
                "logs:PutLogEvents",
                "logs:CreateLogStream"
            ]
        }),
        new PolicyStatement({
            effect: Effect.ALLOW,
            resources: [`arn:aws:glue:${region}:${accountId}:catalog`,
            `arn:aws:glue:${region}:${accountId}:database/${glueDatabase.databaseName}`,
            `arn:aws:glue:${region}:${accountId}:table/${glueDatabase.databaseName}/${inputTable.tableName}`
        ],
            actions: [
                "glue:GetTable",
                "glue:GetTableVersion",
                "glue:GetTableVersions"
            ]
        }),
        new PolicyStatement({
            effect: Effect.ALLOW,
            resources: [
                `arn:aws:kms:${region}:${accountId}:key/*`
            ],
            actions: [
                "kms:GenerateDataKey",
                "kms:Decrypt"
            ]
        })
    ]});

  const deliveryStreamRole = new Role(this, `InputDataDeliveryStreamRole`, {
    roleName: `${environment.name}-${environment.project}-delivery-stream-role`,
    description: 'IAM Role self registration kinesis firehose iam role',
    assumedBy: new ServicePrincipal('firehose.amazonaws.com'),
    inlinePolicies:{
      firehosePolicyDocument: firehosePolicyDocument
    }
  })
  validatorLambda.grantInvoke(deliveryStreamRole) // needed for transformation


  const deliveryDestination = new S3CustomDestination({
    bucketArn: props.inputBucket.bucketArn,
    roleArn: deliveryStreamRole.roleArn,
    prefix: 'raw_data/year=!{timestamp:yyyy}/month=!{timestamp:MM}/day=!{timestamp:dd}/hour=!{timestamp:HH}/',
    errorOutputPrefix: "failed_data/error=!{firehose:error-output-type}/dt=!{timestamp:yyyy'-'MM'-'dd}/h=!{timestamp:HH}/",
    bufferingHints: {
        intervalInSeconds: 60,
        sizeInMBs: 128,
    },
    processingConfiguration: {
        enabled: true,
        processors: [{
            type: 'Lambda',
            parameters: [
                { parameterName: 'LambdaArn', parameterValue: validatorLambda.functionArn},
                { parameterName: 'BufferIntervalInSeconds', parameterValue: '60'},
                { parameterName: 'BufferSizeInMBs', parameterValue: '1'},
                { parameterName: 'NumberOfRetries', parameterValue: '3'}
            ],
        }],
    },
    cloudWatchLoggingOptions: {
        enabled: true,
        logGroupName: deliveryStreamLogGroup.logGroupName,
        logStreamName: deliveryStreamLogGroup.logGroupName
    },
    // encryptionConfiguration: {
    //     // kmsEncryptionConfig: {
    //     //     awskmsKeyArn: props.kms.keyArn,
    //     // }
    //     noEncryptionConfig: 'noEncryptionConfig',
    // },
    dataFormatConversionConfiguration: {
        enabled: true,
        inputFormatConfiguration: {
          deserializer: {
            hiveJsonSerDe: {},
          },
        },
        outputFormatConfiguration: {
          serializer: {
            parquetSerDe: {},
          },
        },
        schemaConfiguration: {
          catalogId: accountId,
          databaseName: glueDatabase.databaseName,
          region: region,
          roleArn: deliveryStreamRole.roleArn,
          tableName: inputTable.tableName
        },
    },
  });

   // needed for processers to return data to stream

  const deliveryStream = new DeliveryStream(this, `InputDataDeliveryStream`, {
    deliveryStreamName: `${environment.name}-${environment.project}-delivery-stream`,
    // encryption: FirehoseStreamEncryption.AWS_OWNED,
    role: deliveryStreamRole,
    sourceStream: dataStream,
    destinations: [deliveryDestination],
  });

  }
}
