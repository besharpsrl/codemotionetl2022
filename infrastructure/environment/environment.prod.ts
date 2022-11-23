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
            { subnetId: 'subnet-08947c72435faa085', availabilityZone: 'euw1-az1' },
            { subnetId: 'subnet-014ae6ee9b761097f', availabilityZone: 'euw1-az2' },
            { subnetId: 'subnet-079110212b62bf33a', availabilityZone: 'euw1-az3' }
        ],
        private: [
            { subnetId: 'subnet-05655e10d4bd92d95', availabilityZone: 'euw1-az1' },
            { subnetId: 'subnet-08b377a9b93cc94cb', availabilityZone: 'euw1-az2' },
            { subnetId: 'subnet-0868c3822a1f45b0b', availabilityZone: 'euw1-az3' }
        ],
        natted: [
            { subnetId: 'subnet-043cd7bcac84f76c6', availabilityZone: 'euw1-az1' },
            { subnetId: 'subnet-09e442c1c82672557', availabilityZone: 'euw1-az2' },
            { subnetId: 'subnet-06c5bbe5752b87207', availabilityZone: 'euw1-az3' }
        ],
    },
};
