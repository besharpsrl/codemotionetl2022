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
        public: ['subnet-08947c72435faa085', 'subnet-014ae6ee9b761097f','subnet-079110212b62bf33a'],
        private: ['subnet-05655e10d4bd92d95','subnet-08b377a9b93cc94cb','subnet-0868c3822a1f45b0b'],
        natted: ['subnet-043cd7bcac84f76c6','subnet-09e442c1c82672557','subnet-06c5bbe5752b87207'],
    },
};
