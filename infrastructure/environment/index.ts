
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
    subnetPublic: string;
    subnetPrivate: string;
};

try {
    env = require(`./environment.${process.env.ENVIRONMENT}`).environment;
} catch (e) {
    env = require('./environment.dev').environment;
}


export const environment = env;