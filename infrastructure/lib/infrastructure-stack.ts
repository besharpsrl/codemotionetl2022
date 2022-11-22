import {Stack, StackProps, Stage, StageProps, Tags} from "aws-cdk-lib";
import {Construct} from "constructs";
import {environment} from "../environment";
// import {LambdaLayers} from "./components/lambda-layers";
import {StorageStack} from "./stacks/storage";
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
    private rawInputPrefix: string = 'raw_data';
    private preprocessedInputPrefix: string = 'preprocessed_data';
    private carCounterOutputPrefix: string = 'car_counter';
    private carsPlateModelImageOutputPrefix: string = 'cars_images';
    private carsPlateModelDataOutputPrefix: string = 'cars_model_plate';

    public vpc: IVpc;
    public publicSubnets: ISubnet[];

    // private readonly lambdaLayers: LambdaLayers;
    private readonly storageStack: StorageStack;

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
        this.storageStack = new StorageStack(this, 'StorageStack', {
            // id: "6"
        });
    }
}
