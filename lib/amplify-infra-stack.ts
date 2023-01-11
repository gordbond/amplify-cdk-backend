import * as cdk from '@aws-cdk/core';
import * as amplify from "@aws-cdk/aws-amplify";
import * as cdkv2 from 'aws-cdk-lib';
import * as cognito from "@aws-cdk/aws-cognito";
// import { aws_cognito as cognito} from 'aws-cdk-lib';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
// import * as sqs from 'aws-cdk-lib/aws-sqs';

import * as config from '../config.json';

const appsync = require("@aws-cdk/aws-appsync");
const cdk_appsync_transformer = require("cdk-appsync-transformer");


export class AmplifyInfraStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // CREATE COGNITO USER POOL AND IDENTITY POOL 
    const userPool = new cognito.UserPool(this, "AmplifyCDKUserPool", {
      selfSignUpEnabled: true, // Allow users to sign up
      autoVerify: { email: true }, // Verify email addresses by sending a verification code
      signInAliases: { email: true }, // Set email as an alias
    });

    //Pool of users (Could be 3rd party as well)
    const userPoolClient = new cognito.UserPoolClient(this, "AmplifyCDKUserPoolClient", {
      userPool,
      generateSecret: false, // Don't need to generate secret for web app running on browsers
    });

    //Permissions for users in user pool
    const identityPool = new cognito.CfnIdentityPool(this, "AmplifyCDKIdentityPool", {
      allowUnauthenticatedIdentities: true, 
      cognitoIdentityProviders: [ {
          clientId: userPoolClient.userPoolClientId,
          providerName: userPool.userPoolProviderName,
      }],
    });

    // CREAT THE APPSYNC API
    const appsync_api = new cdk_appsync_transformer.AppSyncTransformer(this, "CDKAmplifyProject", {
      schemaPath: 'graphql/schema.graphql',
      authorizationConfig: {
        defaultAuthorization: {
            authorizationType: appsync.AuthorizationType.USER_POOL,
            userPoolConfig: {
                userPool: userPool,
                appIdClientRegex: userPoolClient.userPoolClientId,
                defaultAction: appsync.UserPoolDefaultAction.ALLOW
            }
        }
      }
    });
    

    //Creates the amplify App using the config file 
    const amplifyApp = new amplify.App(this, 'MyApp', {
      sourceCodeProvider: new amplify.GitHubSourceCodeProvider({
        owner: config['amplify-app'].repository_owner,
        repository: config['amplify-app'].repository_name,
        oauthToken: cdk.SecretValue.secretsManager('GitHubToken'),
      }),
      environmentVariables: {
        'IDENTITY_POOL_ID': identityPool.ref,
        'USER_POOL_ID': userPool.userPoolId,
        'USER_POOL_CLIENT_ID': userPoolClient.userPoolClientId,
        'REGION': this.region,
        'APPSYNC_API': appsync_api.appsyncAPI.graphqlUrl,
      }
    });

    const masterBranch = amplifyApp.addBranch(config['amplify-app'].branch);

  }
}
