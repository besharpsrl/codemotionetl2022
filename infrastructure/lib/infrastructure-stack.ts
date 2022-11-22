import {Stack, StackProps, Stage, StageProps, Tags} from "aws-cdk-lib";
import {Construct} from "constructs";
import {environment} from "../environment";
// import {LambdaLayers} from "./components/lambda-layers";
import {DataStorage} from "./constructs/data-storage";
import {KinesisInput} from "./constructs/kinesis-input";
import {Vpc, IVpc, ISubnet, Subnet} from "aws-cdk-lib/aws-ec2";

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

    // private readonly lambdaLayers: LambdaLayers;
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
        // this.lambdaLayers = new LambdaLayers(this, 'LambdaLayersStack');

        // TODO: create RS
        this.dataStorage = new DataStorage(this, 'DataStorage', {
        });

        this.kinesisInput = new KinesisInput(this, 'KinesisInput', {
            inputBucket: this.dataStorage.rawDataBucket
        });

        // Crawler su transformed bucket

        

    }
}
