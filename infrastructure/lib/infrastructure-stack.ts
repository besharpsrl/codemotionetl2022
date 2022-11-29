import {aws_lambda, aws_s3_notifications, Duration, Stack, StackProps, Stage, StageProps} from "aws-cdk-lib";
import {Construct} from "constructs";
import {environment} from "../environment";
import {DataStorage} from "./constructs/data-storage";
import {DataProcessing} from "./constructs/data-processing";
import {KinesisInput} from "./constructs/kinesis-input";
import {Vpc, IVpc, ISubnet, Subnet} from "aws-cdk-lib/aws-ec2";
import * as path from "path";
import {ManagedPolicy, Role, ServicePrincipal} from "aws-cdk-lib/aws-iam";

export class InfrastructureStage extends Stage {
    private infrastructureStack: InfrastructureStack;

    constructor(scope: Construct, id: string, props: StageProps) {
        super(scope, id, props);
        this.infrastructureStack = new InfrastructureStack(this, "BesharpCdkInfrastructureStack", {
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
    public subnets: { public: ISubnet[]; natted: ISubnet[]; private: ISubnet[]; }

    private readonly dataStorage: DataStorage;
    private readonly kinesisInput: KinesisInput;
    private readonly dataProcessing: DataProcessing;

    constructor(scope: Construct, id: string, props: StackProps) {
        super(scope, id, props);

        /* **********************
            Networking
        ************************* */
        this.vpc = Vpc.fromLookup(this, `${id}VPC`, {
            vpcId: environment.vpcId,
        });

        this.subnets = {
            public: environment.subnets.public.map((s, idx) => Subnet.fromSubnetAttributes(this, `SubnetPublic${idx}`, {subnetId: s.subnetId, availabilityZone: s.availabilityZone})),
            natted: environment.subnets.natted.map((s, idx) => Subnet.fromSubnetAttributes(this, `SubnetNatted${idx}`, {subnetId: s.subnetId, availabilityZone: s.availabilityZone})),
            private: environment.subnets.private.map((s, idx) => Subnet.fromSubnetAttributes(this, `SubnetPrivate${idx}`, {subnetId: s.subnetId, availabilityZone: s.availabilityZone})),
        }

        /* **********************
            Stacks
        ************************* */
        this.dataStorage = new DataStorage(this, 'DataStorage', {
            vpc: this.vpc,
            subnets: this.subnets,
        });

        this.kinesisInput = new KinesisInput(this, 'KinesisInput', {
            inputBucket: this.dataStorage.inputBucket
        });

        this.dataProcessing = new DataProcessing(this, 'DataProcessing', {
            vpc: this.vpc,
            subnets: this.subnets,
            inputBucket: this.dataStorage.inputBucket,
            outputBucket: this.dataStorage.transformedBucket
        });

    }
}
