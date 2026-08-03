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

export type SchemaAuthCredentials = {
  __typename?: 'AuthCredentials';
  accessToken: Scalars['String']['output'];
  accessTokenExpiresAt: Scalars['String']['output'];
  auid: Scalars['ID']['output'];
  refreshToken: Scalars['String']['output'];
};

export type SchemaAuthenticatedToken = {
  __typename?: 'AuthenticatedToken';
  auid: Scalars['ID']['output'];
  id: Scalars['ID']['output'];
};

export type SchemaCreatedUser = {
  __typename?: 'CreatedUser';
  auid: Scalars['ID']['output'];
  token: SchemaToken;
};

export type SchemaDefaultVariation = {
  __typename?: 'DefaultVariation';
  auid: Scalars['ID']['output'];
  variationId: Scalars['ID']['output'];
};

export type SchemaDescription = {
  __typename?: 'Description';
  text?: Maybe<Scalars['String']['output']>;
  updatedAt: Scalars['String']['output'];
  variationId: Scalars['ID']['output'];
};

export type SchemaExternalAuthenticationInput = {
  providerId: Scalars['String']['input'];
  token: Scalars['String']['input'];
};

export type SchemaExternalIdentity = {
  __typename?: 'ExternalIdentity';
  createdAt: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  providerId: Scalars['String']['output'];
};

export type SchemaIdentity = {
  __typename?: 'Identity';
  auid: Scalars['ID']['output'];
  id: Scalars['ID']['output'];
};

export type SchemaMutation = {
  __typename?: 'Mutation';
  acceptParent: SchemaParents;
  addUsername: SchemaUsernames;
  changeDefaultUsername: SchemaUsernames;
  changeDescription: SchemaDescription;
  changeName: SchemaName;
  changeStatus: SchemaStatus;
  changeUsername: SchemaUsernames;
  changeVariationIcon: SchemaVariation;
  changeVariationLocationId: SchemaVariation;
  clearDescription: SchemaDescription;
  clearStatus: SchemaStatus;
  createUser: SchemaCreatedUser;
  createVariation: SchemaVariation;
  finishPasskeyRegistration: Scalars['Boolean']['output'];
  linkExternalIdentity: SchemaExternalIdentity;
  loginWithExternalIdentity: SchemaAuthenticatedToken;
  loginWithPasskey: SchemaAuthenticatedToken;
  loginWithPassword: SchemaToken;
  loginWithToken: SchemaToken;
  loginWithTotp: SchemaAuthenticatedToken;
  refreshCredentials: SchemaAuthCredentials;
  removeUsername: SchemaUsernames;
  reorderParents: SchemaParents;
  requestParent: SchemaParents;
  revokeCredentials: Scalars['Boolean']['output'];
  setDefaultVariation: SchemaDefaultVariation;
  setPassword: Scalars['Boolean']['output'];
  startPasskeyLogin: SchemaPasskeyCeremony;
  startPasskeyRegistration: SchemaPasskeyCeremony;
  startTotpEnrollment: SchemaTotpEnrollmentResponse;
  unlinkExternalIdentity: Scalars['Boolean']['output'];
  verifyTotpEnrollment: Scalars['Boolean']['output'];
  wrapTokenInCredentials: SchemaAuthCredentials;
};


export type SchemaMutationAcceptParentArgs = {
  auid: Scalars['ID']['input'];
  parentAuid: Scalars['ID']['input'];
  tokenId?: InputMaybe<Scalars['String']['input']>;
};


export type SchemaMutationAddUsernameArgs = {
  auid: Scalars['ID']['input'];
  tokenId?: InputMaybe<Scalars['String']['input']>;
  username: Scalars['String']['input'];
};


export type SchemaMutationChangeDefaultUsernameArgs = {
  auid: Scalars['ID']['input'];
  tokenId?: InputMaybe<Scalars['String']['input']>;
  username: Scalars['String']['input'];
};


export type SchemaMutationChangeDescriptionArgs = {
  auid: Scalars['ID']['input'];
  text?: InputMaybe<Scalars['String']['input']>;
  tokenId?: InputMaybe<Scalars['String']['input']>;
  variationId: Scalars['ID']['input'];
};


export type SchemaMutationChangeNameArgs = {
  auid: Scalars['ID']['input'];
  elements: Array<SchemaNameElementInput>;
  tokenId?: InputMaybe<Scalars['String']['input']>;
  variationId: Scalars['ID']['input'];
};


export type SchemaMutationChangeStatusArgs = {
  auid: Scalars['ID']['input'];
  durationMinutes?: InputMaybe<Scalars['Int']['input']>;
  emoji?: InputMaybe<Scalars['String']['input']>;
  expiresAt?: InputMaybe<Scalars['String']['input']>;
  text?: InputMaybe<Scalars['String']['input']>;
  tokenId?: InputMaybe<Scalars['String']['input']>;
  variationId: Scalars['ID']['input'];
};


export type SchemaMutationChangeUsernameArgs = {
  auid: Scalars['ID']['input'];
  newUsername: Scalars['String']['input'];
  oldUsername: Scalars['String']['input'];
  tokenId?: InputMaybe<Scalars['String']['input']>;
};


export type SchemaMutationChangeVariationIconArgs = {
  auid: Scalars['ID']['input'];
  icon?: InputMaybe<Scalars['String']['input']>;
  tokenId?: InputMaybe<Scalars['String']['input']>;
  variationId: Scalars['ID']['input'];
};


export type SchemaMutationChangeVariationLocationIdArgs = {
  auid: Scalars['ID']['input'];
  locationId?: InputMaybe<Scalars['String']['input']>;
  tokenId?: InputMaybe<Scalars['String']['input']>;
  variationId: Scalars['ID']['input'];
};


export type SchemaMutationClearDescriptionArgs = {
  auid: Scalars['ID']['input'];
  tokenId?: InputMaybe<Scalars['String']['input']>;
  variationId: Scalars['ID']['input'];
};


export type SchemaMutationClearStatusArgs = {
  auid: Scalars['ID']['input'];
  tokenId?: InputMaybe<Scalars['String']['input']>;
  variationId: Scalars['ID']['input'];
};


export type SchemaMutationCreateUserArgs = {
  contextAuid?: InputMaybe<Scalars['ID']['input']>;
  registrationKey: Scalars['ID']['input'];
  tokenId?: InputMaybe<Scalars['String']['input']>;
};


export type SchemaMutationCreateVariationArgs = {
  auid: Scalars['ID']['input'];
  description?: InputMaybe<Scalars['String']['input']>;
  icon?: InputMaybe<Scalars['String']['input']>;
  locationId?: InputMaybe<Scalars['String']['input']>;
  tokenId?: InputMaybe<Scalars['String']['input']>;
};


export type SchemaMutationFinishPasskeyRegistrationArgs = {
  auid: Scalars['ID']['input'];
  challengeId: Scalars['ID']['input'];
  responseJson: Scalars['String']['input'];
  tokenId?: InputMaybe<Scalars['String']['input']>;
};


export type SchemaMutationLinkExternalIdentityArgs = {
  auid: Scalars['ID']['input'];
  authentication: SchemaExternalAuthenticationInput;
  tokenId?: InputMaybe<Scalars['String']['input']>;
};


export type SchemaMutationLoginWithExternalIdentityArgs = {
  authentication: SchemaExternalAuthenticationInput;
  permissions?: InputMaybe<Array<Scalars['String']['input']>>;
};


export type SchemaMutationLoginWithPasskeyArgs = {
  challengeId: Scalars['ID']['input'];
  responseJson: Scalars['String']['input'];
};


export type SchemaMutationLoginWithPasswordArgs = {
  auid: Scalars['ID']['input'];
  password: Scalars['String']['input'];
  permissions?: InputMaybe<Array<Scalars['String']['input']>>;
};


export type SchemaMutationLoginWithTokenArgs = {
  auid: Scalars['ID']['input'];
  permissions?: InputMaybe<Array<Scalars['String']['input']>>;
  tokenId?: InputMaybe<Scalars['String']['input']>;
};


export type SchemaMutationLoginWithTotpArgs = {
  code: Scalars['String']['input'];
  totpToken: Scalars['String']['input'];
};


export type SchemaMutationRefreshCredentialsArgs = {
  refreshToken: Scalars['String']['input'];
};


export type SchemaMutationRemoveUsernameArgs = {
  auid: Scalars['ID']['input'];
  tokenId?: InputMaybe<Scalars['String']['input']>;
  username: Scalars['String']['input'];
};


export type SchemaMutationReorderParentsArgs = {
  auid: Scalars['ID']['input'];
  parentAuids: Array<Scalars['ID']['input']>;
  tokenId?: InputMaybe<Scalars['String']['input']>;
};


export type SchemaMutationRequestParentArgs = {
  auid: Scalars['ID']['input'];
  parentAuid: Scalars['ID']['input'];
  tokenId?: InputMaybe<Scalars['String']['input']>;
};


export type SchemaMutationRevokeCredentialsArgs = {
  refreshToken: Scalars['String']['input'];
};


export type SchemaMutationSetDefaultVariationArgs = {
  auid: Scalars['ID']['input'];
  tokenId?: InputMaybe<Scalars['String']['input']>;
  variationId: Scalars['ID']['input'];
};


export type SchemaMutationSetPasswordArgs = {
  auid: Scalars['ID']['input'];
  password: Scalars['String']['input'];
  tokenId?: InputMaybe<Scalars['String']['input']>;
};


export type SchemaMutationStartPasskeyLoginArgs = {
  permissions?: InputMaybe<Array<Scalars['String']['input']>>;
};


export type SchemaMutationStartPasskeyRegistrationArgs = {
  auid: Scalars['ID']['input'];
  displayName?: InputMaybe<Scalars['String']['input']>;
  tokenId?: InputMaybe<Scalars['String']['input']>;
};


export type SchemaMutationStartTotpEnrollmentArgs = {
  auid: Scalars['ID']['input'];
  tokenId?: InputMaybe<Scalars['String']['input']>;
};


export type SchemaMutationUnlinkExternalIdentityArgs = {
  auid: Scalars['ID']['input'];
  externalIdentityId: Scalars['ID']['input'];
  tokenId?: InputMaybe<Scalars['String']['input']>;
};


export type SchemaMutationVerifyTotpEnrollmentArgs = {
  auid: Scalars['ID']['input'];
  code: Scalars['String']['input'];
  tokenId?: InputMaybe<Scalars['String']['input']>;
};


export type SchemaMutationWrapTokenInCredentialsArgs = {
  auid: Scalars['ID']['input'];
  tokenId?: InputMaybe<Scalars['String']['input']>;
};

export type SchemaName = {
  __typename?: 'Name';
  displayName: Scalars['String']['output'];
  elements: Array<SchemaNameElement>;
  variationId: Scalars['ID']['output'];
};

export type SchemaNameElement = {
  __typename?: 'NameElement';
  partType?: Maybe<SchemaNamePartType>;
  separatorType?: Maybe<SchemaNameSeparatorType>;
  value?: Maybe<Scalars['String']['output']>;
};

export type SchemaNameElementInput = {
  partType?: InputMaybe<SchemaNamePartType>;
  separatorType?: InputMaybe<SchemaNameSeparatorType>;
  value?: InputMaybe<Scalars['String']['input']>;
};

export enum SchemaNamePartType {
  Credential = 'CREDENTIAL',
  FamilyName = 'FAMILY_NAME',
  Generation = 'GENERATION',
  GivenName = 'GIVEN_NAME',
  Title = 'TITLE',
  Unstructured = 'UNSTRUCTURED'
}

export enum SchemaNameSeparatorType {
  Apostrophe = 'APOSTROPHE',
  CommaSpace = 'COMMA_SPACE',
  Hyphen = 'HYPHEN',
  Space = 'SPACE'
}

export type SchemaPaginatedIdentities = {
  __typename?: 'PaginatedIdentities';
  items: Array<SchemaIdentity>;
};

export type SchemaParent = {
  __typename?: 'Parent';
  auid: Scalars['ID']['output'];
  status: SchemaParentStatus;
};

export enum SchemaParentStatus {
  Accepted = 'ACCEPTED',
  Pending = 'PENDING'
}

export type SchemaParents = {
  __typename?: 'Parents';
  auid: Scalars['ID']['output'];
  parents: Array<SchemaParent>;
};

export type SchemaPasskeyCeremony = {
  __typename?: 'PasskeyCeremony';
  challengeId: Scalars['ID']['output'];
  optionsJson: Scalars['String']['output'];
};

export type SchemaQuery = {
  __typename?: 'Query';
  defaultVariation?: Maybe<SchemaDefaultVariation>;
  description?: Maybe<SchemaDescription>;
  externalIdentities: Array<SchemaExternalIdentity>;
  identities: SchemaPaginatedIdentities;
  name?: Maybe<SchemaName>;
  ownerByUsername?: Maybe<Scalars['ID']['output']>;
  parents?: Maybe<SchemaParents>;
  status?: Maybe<SchemaStatus>;
  user?: Maybe<SchemaUser>;
  usernames?: Maybe<SchemaUsernames>;
  variations: Array<SchemaVariation>;
};


export type SchemaQueryDefaultVariationArgs = {
  auid: Scalars['ID']['input'];
};


export type SchemaQueryDescriptionArgs = {
  variationId: Scalars['ID']['input'];
};


export type SchemaQueryExternalIdentitiesArgs = {
  auid: Scalars['ID']['input'];
  tokenId?: InputMaybe<Scalars['String']['input']>;
};


export type SchemaQueryIdentitiesArgs = {
  contextAuid: Scalars['ID']['input'];
  cursor?: InputMaybe<Scalars['ID']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  recursive?: InputMaybe<Scalars['Boolean']['input']>;
};


export type SchemaQueryNameArgs = {
  variationId: Scalars['ID']['input'];
};


export type SchemaQueryOwnerByUsernameArgs = {
  username: Scalars['String']['input'];
};


export type SchemaQueryParentsArgs = {
  auid: Scalars['ID']['input'];
};


export type SchemaQueryStatusArgs = {
  variationId: Scalars['ID']['input'];
};


export type SchemaQueryUserArgs = {
  auid: Scalars['ID']['input'];
};


export type SchemaQueryUsernamesArgs = {
  auid: Scalars['ID']['input'];
};


export type SchemaQueryVariationsArgs = {
  auid: Scalars['ID']['input'];
};

export type SchemaStatus = {
  __typename?: 'Status';
  emoji?: Maybe<Scalars['String']['output']>;
  expiresAt?: Maybe<Scalars['String']['output']>;
  isExpired: Scalars['Boolean']['output'];
  text?: Maybe<Scalars['String']['output']>;
  updatedAt: Scalars['String']['output'];
  variationId: Scalars['ID']['output'];
};

export type SchemaToken = {
  __typename?: 'Token';
  id: Scalars['ID']['output'];
};

export type SchemaTotpEnrollmentResponse = {
  __typename?: 'TotpEnrollmentResponse';
  otpauthUrl: Scalars['String']['output'];
  secret: Scalars['String']['output'];
};

export type SchemaUser = {
  __typename?: 'User';
  defaultVariation?: Maybe<SchemaDefaultVariation>;
  identity: SchemaIdentity;
  usernames: SchemaUsernames;
};

export type SchemaUsernames = {
  __typename?: 'Usernames';
  auid: Scalars['ID']['output'];
  defaultUsername: Scalars['String']['output'];
  usernames: Array<Scalars['String']['output']>;
};

export type SchemaVariation = {
  __typename?: 'Variation';
  auid: Scalars['ID']['output'];
  createdAt: Scalars['String']['output'];
  icon?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  locationId?: Maybe<Scalars['String']['output']>;
};

export type NameElementInput = {
  partType?: NamePartType | null | undefined;
  separatorType?: NameSeparatorType | null | undefined;
  value?: string | null | undefined;
};

export type NamePartType =
  | 'CREDENTIAL'
  | 'FAMILY_NAME'
  | 'GENERATION'
  | 'GIVEN_NAME'
  | 'TITLE'
  | 'UNSTRUCTURED';

export type NameSeparatorType =
  | 'APOSTROPHE'
  | 'COMMA_SPACE'
  | 'HYPHEN'
  | 'SPACE';

export type LoginWithPasswordMutationVariables = Exact<{
  auid: string | number;
  password: string;
  permissions?: Array<string> | string | null | undefined;
}>;


export type LoginWithPasswordMutation = { loginWithPassword: { id: string } };

export type WrapTokenInCredentialsMutationVariables = Exact<{
  auid: string | number;
  tokenId?: string | null | undefined;
}>;


export type WrapTokenInCredentialsMutation = { wrapTokenInCredentials: { auid: string, accessToken: string, refreshToken: string, accessTokenExpiresAt: string } };

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
  registrationKey: string | number;
}>;


export type CreateUserMutation = { createUser: { auid: string, token: { id: string } } };

export type SetPasswordMutationVariables = Exact<{
  auid: string | number;
  tokenId?: string | null | undefined;
  password: string;
}>;


export type SetPasswordMutation = { setPassword: boolean };

export type OwnerByUsernameQueryVariables = Exact<{
  username: string;
}>;


export type OwnerByUsernameQuery = { ownerByUsername: string | null };

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


export type VariationsQuery = { variations: Array<{ id: string, auid: string, locationId: string | null, icon: string | null, createdAt: string }> };

export type NameQueryVariables = Exact<{
  variationId: string | number;
}>;


export type NameQuery = { name: { variationId: string, displayName: string, elements: Array<{ partType: NamePartType | null, value: string | null, separatorType: NameSeparatorType | null }> } | null };

export type DescriptionQueryVariables = Exact<{
  variationId: string | number;
}>;


export type DescriptionQuery = { description: { variationId: string, text: string | null, updatedAt: string } | null };

export type StatusQueryVariables = Exact<{
  variationId: string | number;
}>;


export type StatusQuery = { status: { variationId: string, text: string | null, emoji: string | null, expiresAt: string | null, updatedAt: string, isExpired: boolean } | null };

export type DefaultVariationQueryVariables = Exact<{
  auid: string | number;
}>;


export type DefaultVariationQuery = { defaultVariation: { auid: string, variationId: string } | null };

export type AddUsernameMutationVariables = Exact<{
  auid: string | number;
  tokenId?: string | null | undefined;
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

export type ChangeUsernameMutationVariables = Exact<{
  auid: string | number;
  oldUsername: string;
  newUsername: string;
}>;


export type ChangeUsernameMutation = { changeUsername: { auid: string, usernames: Array<string>, defaultUsername: string } };

export type CreateVariationMutationVariables = Exact<{
  auid: string | number;
  description?: string | null | undefined;
  locationId?: string | null | undefined;
  icon?: string | null | undefined;
}>;


export type CreateVariationMutation = { createVariation: { id: string, auid: string, locationId: string | null, icon: string | null, createdAt: string } };

export type ChangeNameMutationVariables = Exact<{
  auid: string | number;
  variationId: string | number;
  elements: Array<NameElementInput> | NameElementInput;
}>;


export type ChangeNameMutation = { changeName: { variationId: string, displayName: string, elements: Array<{ partType: NamePartType | null, value: string | null, separatorType: NameSeparatorType | null }> } };

export type ChangeStatusMutationVariables = Exact<{
  auid: string | number;
  variationId: string | number;
  text?: string | null | undefined;
}>;


export type ChangeStatusMutation = { changeStatus: { variationId: string, text: string | null, emoji: string | null, expiresAt: string | null, updatedAt: string, isExpired: boolean } };

export type ChangeDescriptionMutationVariables = Exact<{
  auid: string | number;
  variationId: string | number;
  text?: string | null | undefined;
}>;


export type ChangeDescriptionMutation = { changeDescription: { variationId: string, text: string | null, updatedAt: string } };

export type SetDefaultVariationMutationVariables = Exact<{
  auid: string | number;
  variationId: string | number;
}>;


export type SetDefaultVariationMutation = { setDefaultVariation: { auid: string, variationId: string } };

export type ExternalIdentitiesQueryVariables = Exact<{
  auid: string | number;
  tokenId?: string | null | undefined;
}>;


export type ExternalIdentitiesQuery = { externalIdentities: Array<{ id: string, providerId: string, createdAt: string }> };

export type UnlinkExternalIdentityMutationVariables = Exact<{
  auid: string | number;
  externalIdentityId: string | number;
  tokenId?: string | null | undefined;
}>;


export type UnlinkExternalIdentityMutation = { unlinkExternalIdentity: boolean };


export const LoginWithPasswordDocument = gql`
    mutation LoginWithPassword($auid: ID!, $password: String!, $permissions: [String!]) {
  loginWithPassword(auid: $auid, password: $password, permissions: $permissions) {
    id
  }
}
    `;
export const WrapTokenInCredentialsDocument = gql`
    mutation WrapTokenInCredentials($auid: ID!, $tokenId: String) {
  wrapTokenInCredentials(auid: $auid, tokenId: $tokenId) {
    auid
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
    mutation CreateUser($contextAuid: ID, $tokenId: String, $registrationKey: ID!) {
  createUser(
    contextAuid: $contextAuid
    tokenId: $tokenId
    registrationKey: $registrationKey
  ) {
    auid
    token {
      id
    }
  }
}
    `;
export const SetPasswordDocument = gql`
    mutation SetPassword($auid: ID!, $tokenId: String, $password: String!) {
  setPassword(auid: $auid, tokenId: $tokenId, password: $password)
}
    `;
export const OwnerByUsernameDocument = gql`
    query OwnerByUsername($username: String!) {
  ownerByUsername(username: $username)
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
    locationId
    icon
    createdAt
  }
}
    `;
export const NameDocument = gql`
    query Name($variationId: ID!) {
  name(variationId: $variationId) {
    variationId
    displayName
    elements {
      partType
      value
      separatorType
    }
  }
}
    `;
export const DescriptionDocument = gql`
    query Description($variationId: ID!) {
  description(variationId: $variationId) {
    variationId
    text
    updatedAt
  }
}
    `;
export const StatusDocument = gql`
    query Status($variationId: ID!) {
  status(variationId: $variationId) {
    variationId
    text
    emoji
    expiresAt
    updatedAt
    isExpired
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
    mutation AddUsername($auid: ID!, $tokenId: String, $username: String!) {
  addUsername(auid: $auid, tokenId: $tokenId, username: $username) {
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
export const ChangeUsernameDocument = gql`
    mutation ChangeUsername($auid: ID!, $oldUsername: String!, $newUsername: String!) {
  changeUsername(
    auid: $auid
    oldUsername: $oldUsername
    newUsername: $newUsername
  ) {
    auid
    usernames
    defaultUsername
  }
}
    `;
export const CreateVariationDocument = gql`
    mutation CreateVariation($auid: ID!, $description: String, $locationId: String, $icon: String) {
  createVariation(
    auid: $auid
    description: $description
    locationId: $locationId
    icon: $icon
  ) {
    id
    auid
    locationId
    icon
    createdAt
  }
}
    `;
export const ChangeNameDocument = gql`
    mutation ChangeName($auid: ID!, $variationId: ID!, $elements: [NameElementInput!]!) {
  changeName(auid: $auid, variationId: $variationId, elements: $elements) {
    variationId
    displayName
    elements {
      partType
      value
      separatorType
    }
  }
}
    `;
export const ChangeStatusDocument = gql`
    mutation ChangeStatus($auid: ID!, $variationId: ID!, $text: String) {
  changeStatus(auid: $auid, variationId: $variationId, text: $text) {
    variationId
    text
    emoji
    expiresAt
    updatedAt
    isExpired
  }
}
    `;
export const ChangeDescriptionDocument = gql`
    mutation ChangeDescription($auid: ID!, $variationId: ID!, $text: String) {
  changeDescription(auid: $auid, variationId: $variationId, text: $text) {
    variationId
    text
    updatedAt
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
export const ExternalIdentitiesDocument = gql`
    query ExternalIdentities($auid: ID!, $tokenId: String) {
  externalIdentities(auid: $auid, tokenId: $tokenId) {
    id
    providerId
    createdAt
  }
}
    `;
export const UnlinkExternalIdentityDocument = gql`
    mutation UnlinkExternalIdentity($auid: ID!, $externalIdentityId: ID!, $tokenId: String) {
  unlinkExternalIdentity(
    auid: $auid
    externalIdentityId: $externalIdentityId
    tokenId: $tokenId
  )
}
    `;

export type SdkFunctionWrapper = <T>(action: (requestHeaders?:Record<string, string>) => Promise<T>, operationName: string, operationType?: string, variables?: any) => Promise<T>;


const defaultWrapper: SdkFunctionWrapper = (action, _operationName, _operationType, _variables) => action();

export function getSdk(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  return {
    LoginWithPassword(variables: LoginWithPasswordMutationVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<LoginWithPasswordMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<LoginWithPasswordMutation>({ document: LoginWithPasswordDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'LoginWithPassword', 'mutation', variables);
    },
    WrapTokenInCredentials(variables: WrapTokenInCredentialsMutationVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<WrapTokenInCredentialsMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<WrapTokenInCredentialsMutation>({ document: WrapTokenInCredentialsDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'WrapTokenInCredentials', 'mutation', variables);
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
    SetPassword(variables: SetPasswordMutationVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<SetPasswordMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<SetPasswordMutation>({ document: SetPasswordDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'SetPassword', 'mutation', variables);
    },
    OwnerByUsername(variables: OwnerByUsernameQueryVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<OwnerByUsernameQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<OwnerByUsernameQuery>({ document: OwnerByUsernameDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'OwnerByUsername', 'query', variables);
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
    Name(variables: NameQueryVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<NameQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<NameQuery>({ document: NameDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'Name', 'query', variables);
    },
    Description(variables: DescriptionQueryVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<DescriptionQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<DescriptionQuery>({ document: DescriptionDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'Description', 'query', variables);
    },
    Status(variables: StatusQueryVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<StatusQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<StatusQuery>({ document: StatusDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'Status', 'query', variables);
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
    ChangeUsername(variables: ChangeUsernameMutationVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<ChangeUsernameMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<ChangeUsernameMutation>({ document: ChangeUsernameDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'ChangeUsername', 'mutation', variables);
    },
    CreateVariation(variables: CreateVariationMutationVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<CreateVariationMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<CreateVariationMutation>({ document: CreateVariationDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'CreateVariation', 'mutation', variables);
    },
    ChangeName(variables: ChangeNameMutationVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<ChangeNameMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<ChangeNameMutation>({ document: ChangeNameDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'ChangeName', 'mutation', variables);
    },
    ChangeStatus(variables: ChangeStatusMutationVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<ChangeStatusMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<ChangeStatusMutation>({ document: ChangeStatusDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'ChangeStatus', 'mutation', variables);
    },
    ChangeDescription(variables: ChangeDescriptionMutationVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<ChangeDescriptionMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<ChangeDescriptionMutation>({ document: ChangeDescriptionDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'ChangeDescription', 'mutation', variables);
    },
    SetDefaultVariation(variables: SetDefaultVariationMutationVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<SetDefaultVariationMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<SetDefaultVariationMutation>({ document: SetDefaultVariationDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'SetDefaultVariation', 'mutation', variables);
    },
    ExternalIdentities(variables: ExternalIdentitiesQueryVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<ExternalIdentitiesQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<ExternalIdentitiesQuery>({ document: ExternalIdentitiesDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'ExternalIdentities', 'query', variables);
    },
    UnlinkExternalIdentity(variables: UnlinkExternalIdentityMutationVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<UnlinkExternalIdentityMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<UnlinkExternalIdentityMutation>({ document: UnlinkExternalIdentityDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'UnlinkExternalIdentity', 'mutation', variables);
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;