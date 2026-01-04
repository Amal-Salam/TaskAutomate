/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unused-vars */
import * as aws from '@pulumi/aws';
import * as awsx from '@pulumi/awsx';

// VPC with only public subnets 
const vpc = new awsx.ec2.Vpc('app-vpc', {
  numberOfAvailabilityZones: 2,
  subnetSpecs: [
    { type: "Public", cidrMask: 24 },
    // { type: 'Private', cidrMask: 26 },
    // { type: 'Private', cidrMask: 26 },
  ],
  natGateways: { strategy: 'None' },
});

// ECR repo with scan-on-push
const repo = new aws.ecr.Repository('app-repo', {
  imageScanningConfiguration: { scanOnPush: true },
  imageTagMutability: 'IMMUTABLE',
 
});

const lifecyclePolicy = new aws.ecr.LifecyclePolicy("app-repo-lifecycle", {
  repository: repo.name,
  policy: JSON.stringify({
    rules: [
      {
        rulePriority: 1,
        description: "Keep last 10 images",
        selection: {
          tagStatus: "any",
          countType: "imageCountMoreThan",
          countNumber: 10,
        },
        action: {
          type: "expire",
        },
      },
    ],
  }),
});

// Export for CI
export const vpcId = vpc.vpcId;
export const repoUrl = repo.repositoryUrl;
