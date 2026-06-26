/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
import { type GraphQLClient, type RequestOptions } from 'graphql-request';
import gql from 'graphql-tag';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
type GraphQLClientRequestHeaders = RequestOptions['requestHeaders'];
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
};

export type AuthCredentials = {
  __typename?: 'AuthCredentials';
  accessToken: Scalars['String']['output'];
  accessTokenExpiresAt: Scalars['String']['output'];
  refreshToken: Scalars['String']['output'];
};

export type DefaultVariation = {
  __typename?: 'DefaultVariation';
  auid: Scalars['ID']['output'];
  variationId: Scalars['ID']['output'];
};

export type Identity = {
  __typename?: 'Identity';
  auid: Scalars['ID']['output'];
  id: Scalars['ID']['output'];
};

export type Mutation = {
  __typename?: 'Mutation';
  addUsername: Usernames;
  changeDefaultUsername: Usernames;
  changePassword: Scalars['Boolean']['output'];
  changeVariationDescription: Variation;
  changeVariationFirstName: Variation;
  changeVariationIcon: Variation;
  changeVariationLastName: Variation;
  changeVariationLocationId: Variation;
  changeVariationStatus: Variation;
  createUser: Identity;
  createVariation: Variation;
  generateToken: Token;
  login: AuthCredentials;
  refreshCredentials: AuthCredentials;
  removeUsername: Usernames;
  revokeCredentials: Scalars['Boolean']['output'];
  setDefaultVariation: DefaultVariation;
};


export type MutationAddUsernameArgs = {
  auid: Scalars['ID']['input'];
  username: Scalars['String']['input'];
};


export type MutationChangeDefaultUsernameArgs = {
  auid: Scalars['ID']['input'];
  username: Scalars['String']['input'];
};


export type MutationChangePasswordArgs = {
  auid: Scalars['ID']['input'];
  newPassword: Scalars['String']['input'];
  tokenId: Scalars['String']['input'];
};


export type MutationChangeVariationDescriptionArgs = {
  auid: Scalars['ID']['input'];
  description?: InputMaybe<Scalars['String']['input']>;
  variationId: Scalars['ID']['input'];
};


export type MutationChangeVariationFirstNameArgs = {
  auid: Scalars['ID']['input'];
  firstName?: InputMaybe<Scalars['String']['input']>;
  variationId: Scalars['ID']['input'];
};


export type MutationChangeVariationIconArgs = {
  auid: Scalars['ID']['input'];
  icon?: InputMaybe<Scalars['String']['input']>;
  variationId: Scalars['ID']['input'];
};


export type MutationChangeVariationLastNameArgs = {
  auid: Scalars['ID']['input'];
  lastName?: InputMaybe<Scalars['String']['input']>;
  variationId: Scalars['ID']['input'];
};


export type MutationChangeVariationLocationIdArgs = {
  auid: Scalars['ID']['input'];
  locationId?: InputMaybe<Scalars['String']['input']>;
  variationId: Scalars['ID']['input'];
};


export type MutationChangeVariationStatusArgs = {
  auid: Scalars['ID']['input'];
  status?: InputMaybe<Scalars['String']['input']>;
  variationId: Scalars['ID']['input'];
};


export type MutationCreateUserArgs = {
  contextAuid?: InputMaybe<Scalars['ID']['input']>;
  password: Scalars['String']['input'];
  tokenId?: InputMaybe<Scalars['String']['input']>;
  username: Scalars['String']['input'];
};


export type MutationCreateVariationArgs = {
  auid: Scalars['ID']['input'];
  description?: InputMaybe<Scalars['String']['input']>;
  firstName?: InputMaybe<Scalars['String']['input']>;
  icon?: InputMaybe<Scalars['String']['input']>;
  lastName?: InputMaybe<Scalars['String']['input']>;
  locationId?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<Scalars['String']['input']>;
};


export type MutationGenerateTokenArgs = {
  auid: Scalars['ID']['input'];
  password: Scalars['String']['input'];
  permissions?: InputMaybe<Array<Scalars['String']['input']>>;
};


export type MutationLoginArgs = {
  auid: Scalars['ID']['input'];
  password: Scalars['String']['input'];
  permissions?: InputMaybe<Array<Scalars['String']['input']>>;
};


export type MutationRefreshCredentialsArgs = {
  refreshToken: Scalars['String']['input'];
};


export type MutationRemoveUsernameArgs = {
  auid: Scalars['ID']['input'];
  username: Scalars['String']['input'];
};


export type MutationRevokeCredentialsArgs = {
  refreshToken: Scalars['String']['input'];
};


export type MutationSetDefaultVariationArgs = {
  auid: Scalars['ID']['input'];
  variationId: Scalars['ID']['input'];
};

export type Query = {
  __typename?: 'Query';
  defaultVariation?: Maybe<DefaultVariation>;
  user?: Maybe<User>;
  usernames?: Maybe<Usernames>;
  variations: Array<Variation>;
};


export type QueryDefaultVariationArgs = {
  auid: Scalars['ID']['input'];
};


export type QueryUserArgs = {
  auid: Scalars['ID']['input'];
};


export type QueryUsernamesArgs = {
  auid: Scalars['ID']['input'];
};


export type QueryVariationsArgs = {
  auid: Scalars['ID']['input'];
};

export type Token = {
  __typename?: 'Token';
  id: Scalars['ID']['output'];
};

export type User = {
  __typename?: 'User';
  defaultVariation?: Maybe<DefaultVariation>;
  identity: Identity;
  usernames: Usernames;
};

export type Usernames = {
  __typename?: 'Usernames';
  auid: Scalars['ID']['output'];
  defaultUsername: Scalars['String']['output'];
  usernames: Array<Scalars['String']['output']>;
};

export type Variation = {
  __typename?: 'Variation';
  auid: Scalars['ID']['output'];
  createdAt: Scalars['String']['output'];
  description?: Maybe<Scalars['String']['output']>;
  firstName?: Maybe<Scalars['String']['output']>;
  icon?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  lastName?: Maybe<Scalars['String']['output']>;
  locationId?: Maybe<Scalars['String']['output']>;
  status?: Maybe<Scalars['String']['output']>;
};

export type LoginMutationVariables = Exact<{
  auid: string | number;
  password: string;
  permissions?: Array<string> | string | null | undefined;
}>;


export type LoginMutation = { login: { accessToken: string, refreshToken: string, accessTokenExpiresAt: string } };

export type RefreshCredentialsMutationVariables = Exact<{
  refreshToken: string;
}>;


export type RefreshCredentialsMutation = { refreshCredentials: { accessToken: string, refreshToken: string, accessTokenExpiresAt: string } };

export type RevokeCredentialsMutationVariables = Exact<{
  refreshToken: string;
}>;


export type RevokeCredentialsMutation = { revokeCredentials: boolean };

export type CreateUserMutationVariables = Exact<{
  contextAuid?: string | number | null | undefined;
  tokenId?: string | null | undefined;
  username: string;
  password: string;
}>;


export type CreateUserMutation = { createUser: { auid: string, id: string } };

export type ChangePasswordMutationVariables = Exact<{
  auid: string | number;
  tokenId: string;
  newPassword: string;
}>;


export type ChangePasswordMutation = { changePassword: boolean };

export type UserQueryVariables = Exact<{
  auid: string | number;
}>;


export type UserQuery = { user: { identity: { auid: string, id: string }, usernames: { auid: string, usernames: Array<string>, defaultUsername: string }, defaultVariation: { auid: string, variationId: string } | null } | null };

export type UsernamesQueryVariables = Exact<{
  auid: string | number;
}>;


export type UsernamesQuery = { usernames: { auid: string, usernames: Array<string>, defaultUsername: string } | null };

export type VariationsQueryVariables = Exact<{
  auid: string | number;
}>;


export type VariationsQuery = { variations: Array<{ id: string, auid: string, firstName: string | null, lastName: string | null, status: string | null, description: string | null, locationId: string | null, icon: string | null, createdAt: string }> };

export type DefaultVariationQueryVariables = Exact<{
  auid: string | number;
}>;


export type DefaultVariationQuery = { defaultVariation: { auid: string, variationId: string } | null };

export type AddUsernameMutationVariables = Exact<{
  auid: string | number;
  username: string;
}>;


export type AddUsernameMutation = { addUsername: { auid: string, usernames: Array<string>, defaultUsername: string } };

export type RemoveUsernameMutationVariables = Exact<{
  auid: string | number;
  username: string;
}>;


export type RemoveUsernameMutation = { removeUsername: { auid: string, usernames: Array<string>, defaultUsername: string } };

export type ChangeDefaultUsernameMutationVariables = Exact<{
  auid: string | number;
  username: string;
}>;


export type ChangeDefaultUsernameMutation = { changeDefaultUsername: { auid: string, usernames: Array<string>, defaultUsername: string } };

export type CreateVariationMutationVariables = Exact<{
  auid: string | number;
  firstName?: string | null | undefined;
  lastName?: string | null | undefined;
  status?: string | null | undefined;
  description?: string | null | undefined;
  locationId?: string | null | undefined;
  icon?: string | null | undefined;
}>;


export type CreateVariationMutation = { createVariation: { id: string, auid: string, firstName: string | null, lastName: string | null, status: string | null, description: string | null, locationId: string | null, icon: string | null, createdAt: string } };

export type ChangeVariationFirstNameMutationVariables = Exact<{
  auid: string | number;
  variationId: string | number;
  firstName?: string | null | undefined;
}>;


export type ChangeVariationFirstNameMutation = { changeVariationFirstName: { id: string, firstName: string | null } };

export type ChangeVariationLastNameMutationVariables = Exact<{
  auid: string | number;
  variationId: string | number;
  lastName?: string | null | undefined;
}>;


export type ChangeVariationLastNameMutation = { changeVariationLastName: { id: string, lastName: string | null } };

export type ChangeVariationStatusMutationVariables = Exact<{
  auid: string | number;
  variationId: string | number;
  status?: string | null | undefined;
}>;


export type ChangeVariationStatusMutation = { changeVariationStatus: { id: string, status: string | null } };

export type ChangeVariationDescriptionMutationVariables = Exact<{
  auid: string | number;
  variationId: string | number;
  description?: string | null | undefined;
}>;


export type ChangeVariationDescriptionMutation = { changeVariationDescription: { id: string, description: string | null } };

export type SetDefaultVariationMutationVariables = Exact<{
  auid: string | number;
  variationId: string | number;
}>;


export type SetDefaultVariationMutation = { setDefaultVariation: { auid: string, variationId: string } };


export const LoginDocument = gql`
    mutation Login($auid: ID!, $password: String!, $permissions: [String!]) {
  login(auid: $auid, password: $password, permissions: $permissions) {
    accessToken
    refreshToken
    accessTokenExpiresAt
  }
}
    `;
export const RefreshCredentialsDocument = gql`
    mutation RefreshCredentials($refreshToken: String!) {
  refreshCredentials(refreshToken: $refreshToken) {
    accessToken
    refreshToken
    accessTokenExpiresAt
  }
}
    `;
export const RevokeCredentialsDocument = gql`
    mutation RevokeCredentials($refreshToken: String!) {
  revokeCredentials(refreshToken: $refreshToken)
}
    `;
export const CreateUserDocument = gql`
    mutation CreateUser($contextAuid: ID, $tokenId: String, $username: String!, $password: String!) {
  createUser(
    contextAuid: $contextAuid
    tokenId: $tokenId
    username: $username
    password: $password
  ) {
    auid
    id
  }
}
    `;
export const ChangePasswordDocument = gql`
    mutation ChangePassword($auid: ID!, $tokenId: String!, $newPassword: String!) {
  changePassword(auid: $auid, tokenId: $tokenId, newPassword: $newPassword)
}
    `;
export const UserDocument = gql`
    query User($auid: ID!) {
  user(auid: $auid) {
    identity {
      auid
      id
    }
    usernames {
      auid
      usernames
      defaultUsername
    }
    defaultVariation {
      auid
      variationId
    }
  }
}
    `;
export const UsernamesDocument = gql`
    query Usernames($auid: ID!) {
  usernames(auid: $auid) {
    auid
    usernames
    defaultUsername
  }
}
    `;
export const VariationsDocument = gql`
    query Variations($auid: ID!) {
  variations(auid: $auid) {
    id
    auid
    firstName
    lastName
    status
    description
    locationId
    icon
    createdAt
  }
}
    `;
export const DefaultVariationDocument = gql`
    query DefaultVariation($auid: ID!) {
  defaultVariation(auid: $auid) {
    auid
    variationId
  }
}
    `;
export const AddUsernameDocument = gql`
    mutation AddUsername($auid: ID!, $username: String!) {
  addUsername(auid: $auid, username: $username) {
    auid
    usernames
    defaultUsername
  }
}
    `;
export const RemoveUsernameDocument = gql`
    mutation RemoveUsername($auid: ID!, $username: String!) {
  removeUsername(auid: $auid, username: $username) {
    auid
    usernames
    defaultUsername
  }
}
    `;
export const ChangeDefaultUsernameDocument = gql`
    mutation ChangeDefaultUsername($auid: ID!, $username: String!) {
  changeDefaultUsername(auid: $auid, username: $username) {
    auid
    usernames
    defaultUsername
  }
}
    `;
export const CreateVariationDocument = gql`
    mutation CreateVariation($auid: ID!, $firstName: String, $lastName: String, $status: String, $description: String, $locationId: String, $icon: String) {
  createVariation(
    auid: $auid
    firstName: $firstName
    lastName: $lastName
    status: $status
    description: $description
    locationId: $locationId
    icon: $icon
  ) {
    id
    auid
    firstName
    lastName
    status
    description
    locationId
    icon
    createdAt
  }
}
    `;
export const ChangeVariationFirstNameDocument = gql`
    mutation ChangeVariationFirstName($auid: ID!, $variationId: ID!, $firstName: String) {
  changeVariationFirstName(
    auid: $auid
    variationId: $variationId
    firstName: $firstName
  ) {
    id
    firstName
  }
}
    `;
export const ChangeVariationLastNameDocument = gql`
    mutation ChangeVariationLastName($auid: ID!, $variationId: ID!, $lastName: String) {
  changeVariationLastName(
    auid: $auid
    variationId: $variationId
    lastName: $lastName
  ) {
    id
    lastName
  }
}
    `;
export const ChangeVariationStatusDocument = gql`
    mutation ChangeVariationStatus($auid: ID!, $variationId: ID!, $status: String) {
  changeVariationStatus(auid: $auid, variationId: $variationId, status: $status) {
    id
    status
  }
}
    `;
export const ChangeVariationDescriptionDocument = gql`
    mutation ChangeVariationDescription($auid: ID!, $variationId: ID!, $description: String) {
  changeVariationDescription(
    auid: $auid
    variationId: $variationId
    description: $description
  ) {
    id
    description
  }
}
    `;
export const SetDefaultVariationDocument = gql`
    mutation SetDefaultVariation($auid: ID!, $variationId: ID!) {
  setDefaultVariation(auid: $auid, variationId: $variationId) {
    auid
    variationId
  }
}
    `;

export type SdkFunctionWrapper = <T>(action: (requestHeaders?:Record<string, string>) => Promise<T>, operationName: string, operationType?: string, variables?: any) => Promise<T>;


const defaultWrapper: SdkFunctionWrapper = (action, _operationName, _operationType, _variables) => action();

export function getSdk(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  return {
    Login(variables: LoginMutationVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<LoginMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<LoginMutation>({ document: LoginDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'Login', 'mutation', variables);
    },
    RefreshCredentials(variables: RefreshCredentialsMutationVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<RefreshCredentialsMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<RefreshCredentialsMutation>({ document: RefreshCredentialsDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'RefreshCredentials', 'mutation', variables);
    },
    RevokeCredentials(variables: RevokeCredentialsMutationVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<RevokeCredentialsMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<RevokeCredentialsMutation>({ document: RevokeCredentialsDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'RevokeCredentials', 'mutation', variables);
    },
    CreateUser(variables: CreateUserMutationVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<CreateUserMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<CreateUserMutation>({ document: CreateUserDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'CreateUser', 'mutation', variables);
    },
    ChangePassword(variables: ChangePasswordMutationVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<ChangePasswordMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<ChangePasswordMutation>({ document: ChangePasswordDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'ChangePassword', 'mutation', variables);
    },
    User(variables: UserQueryVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<UserQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<UserQuery>({ document: UserDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'User', 'query', variables);
    },
    Usernames(variables: UsernamesQueryVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<UsernamesQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<UsernamesQuery>({ document: UsernamesDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'Usernames', 'query', variables);
    },
    Variations(variables: VariationsQueryVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<VariationsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<VariationsQuery>({ document: VariationsDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'Variations', 'query', variables);
    },
    DefaultVariation(variables: DefaultVariationQueryVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<DefaultVariationQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<DefaultVariationQuery>({ document: DefaultVariationDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'DefaultVariation', 'query', variables);
    },
    AddUsername(variables: AddUsernameMutationVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<AddUsernameMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<AddUsernameMutation>({ document: AddUsernameDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'AddUsername', 'mutation', variables);
    },
    RemoveUsername(variables: RemoveUsernameMutationVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<RemoveUsernameMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<RemoveUsernameMutation>({ document: RemoveUsernameDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'RemoveUsername', 'mutation', variables);
    },
    ChangeDefaultUsername(variables: ChangeDefaultUsernameMutationVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<ChangeDefaultUsernameMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<ChangeDefaultUsernameMutation>({ document: ChangeDefaultUsernameDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'ChangeDefaultUsername', 'mutation', variables);
    },
    CreateVariation(variables: CreateVariationMutationVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<CreateVariationMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<CreateVariationMutation>({ document: CreateVariationDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'CreateVariation', 'mutation', variables);
    },
    ChangeVariationFirstName(variables: ChangeVariationFirstNameMutationVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<ChangeVariationFirstNameMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<ChangeVariationFirstNameMutation>({ document: ChangeVariationFirstNameDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'ChangeVariationFirstName', 'mutation', variables);
    },
    ChangeVariationLastName(variables: ChangeVariationLastNameMutationVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<ChangeVariationLastNameMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<ChangeVariationLastNameMutation>({ document: ChangeVariationLastNameDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'ChangeVariationLastName', 'mutation', variables);
    },
    ChangeVariationStatus(variables: ChangeVariationStatusMutationVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<ChangeVariationStatusMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<ChangeVariationStatusMutation>({ document: ChangeVariationStatusDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'ChangeVariationStatus', 'mutation', variables);
    },
    ChangeVariationDescription(variables: ChangeVariationDescriptionMutationVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<ChangeVariationDescriptionMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<ChangeVariationDescriptionMutation>({ document: ChangeVariationDescriptionDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'ChangeVariationDescription', 'mutation', variables);
    },
    SetDefaultVariation(variables: SetDefaultVariationMutationVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<SetDefaultVariationMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<SetDefaultVariationMutation>({ document: SetDefaultVariationDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'SetDefaultVariation', 'mutation', variables);
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;