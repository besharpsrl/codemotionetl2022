import {aws_codebuild, aws_codecommit, pipelines, Stack, StackProps} from 'aws-cdk-lib';
import {Construct} from 'constructs';
import {environment} from "../environment";
import {InfrastructureStage} from "./infrastructure-stack";


export class PipelineStack extends Stack {
    private pipeline: pipelines.CodePipeline;

    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);
        this.pipeline = new pipelines.CodePipeline(this, 'Pipeline', {
            pipelineName: `${environment.name}-${environment.project}-pipeline`,
            publishAssetsInParallel: false,
            synth: new pipelines.CodeBuildStep('Synth', {
                projectName: `${environment.name}-${environment.project}-synth`,
                input: pipelines.CodePipelineSource.codeCommit(aws_codecommit.Repository.fromRepositoryArn(this, 'Repository', environment.repository.arn), environment.repository.branch),
                partialBuildSpec: aws_codebuild.BuildSpec.fromObject({
                    phases: {
                        install: {
                            'runtime-versions': {
                                nodejs: 14,
                                python: 3.9
                            }
                        }
                    }
                }),
                env: {
                    ENVIRONMENT: environment.name,
                },
                installCommands: [`bash "$CODEBUILD_SRC_DIR"/infrastructure/scripts/synth/install.sh`],
                commands: [`bash "$CODEBUILD_SRC_DIR"/infrastructure/scripts/synth/build.sh`],
            }),
            selfMutation: true,
        });


        this.pipeline.addStage(new InfrastructureStage(this, 'InfrastructureStage', {
            env: {
                account: environment.account,
                region: environment.region,
            },
        }), {
            // pre: [
            //     new pipelines.CodeBuildStep('UnitTests', {
            //         projectName: `${environment.name}-${environment.project}-unit-tests`,
            //         buildEnvironment: {
            //             privileged: true
            //         },
            //         partialBuildSpec: aws_codebuild.BuildSpec.fromObject({
            //             phases: {
            //                 install: {
            //                     'runtime-versions': {
            //                         nodejs: 14,
            //                         python: 3.9
            //                     }
            //                 }
            //             }
            //         }),
            //         env: {
            //             ENVIRONMENT: environment.name,
            //         },
            //         installCommands: [`bash "$CODEBUILD_SRC_DIR"/infrastructure/scripts/unit-tests/install.sh`],
            //         commands: [`bash "$CODEBUILD_SRC_DIR"/infrastructure/scripts/unit-tests/build.sh`],
            //     }),
            // ]
        });
    }

}
