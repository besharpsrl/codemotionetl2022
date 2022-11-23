
let env: {
    name: "dev" | "prod";
    project: string;
    account: string;
    region: string;
    repository: {
        arn: string;
        branch: string;
    };
    vpcId: string;
    subnets: {
        public: {
            availabilityZone: string;
            subnetId: string;
        }[];
        private: {
            availabilityZone: string;
            subnetId: string;
        }[];
        natted: {
            availabilityZone: string;
            subnetId: string;
        }[];
    };
};

try {
    env = require(`./environment.${process.env.ENVIRONMENT}`).environment;
} catch (e) {
    env = require('./environment.dev').environment;
}


export const environment = env;