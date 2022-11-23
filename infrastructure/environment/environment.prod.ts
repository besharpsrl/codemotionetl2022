export const environment = {
    name: "prod",
    project: "codemotion-cdk-etl",
    account: "919788038405",
    region: "eu-west-1",
    repository: {
        arn: "arn:aws:codecommit:eu-west-1:919788038405:besharp-cdk-etl",
        branch: "master",
    },
    vpcId: 'vpc-0daaee1d7c181cf2b',
    subnets: {
        public: [
            { subnetId: 'subnet-08947c72435faa085', availabilityZone: 'eu-west-1a' },
            { subnetId: 'subnet-014ae6ee9b761097f', availabilityZone: 'eu-west-1b' },
            { subnetId: 'subnet-079110212b62bf33a', availabilityZone: 'eu-west-1c' }
        ],
        private: [
            { subnetId: 'subnet-05655e10d4bd92d95', availabilityZone: 'eu-west-1a' },
            { subnetId: 'subnet-08b377a9b93cc94cb', availabilityZone: 'eu-west-1b' },
            { subnetId: 'subnet-0868c3822a1f45b0b', availabilityZone: 'eu-west-1c' }
        ],
        natted: [
            { subnetId: 'subnet-043cd7bcac84f76c6', availabilityZone: 'eu-west-1a' },
            { subnetId: 'subnet-09e442c1c82672557', availabilityZone: 'eu-west-1b' },
            { subnetId: 'subnet-06c5bbe5752b87207', availabilityZone: 'eu-west-1c' }
        ],
    },
};
