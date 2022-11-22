#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import {environment} from "../infrastructure/environment";
import { PipelineStack } from '../infrastructure/lib/pipeline-stack';
import { InfrastructureStack } from '../infrastructure/lib/infrastructure-stack';

const app = new cdk.App();
new PipelineStack(app, `BesharpCdkPipelineStack`, {
  stackName: `${environment.name}-${environment.project}-pipeline`,
  description: `Stack that contains the pipeline infrastructure for the ${environment.project} environment`,
  tags: {
    Environment: environment.name
  },
  env: {account: environment.account, region: environment.region},
});

//
// new InfrastructureStack(app, `BesharpCdkInfrastructureStack`, {
//   stackName: `${environment.name}-${environment.project}-infrastructure`,
//   description: `Stack that contains the main infrastructure for the ${environment.name}-${environment.project} environment`,
//   tags: {
//       ProjectName: environment.project,
//       Environment: environment.name,
//   },
//   env: {account: environment.account, region: environment.region},
// });
