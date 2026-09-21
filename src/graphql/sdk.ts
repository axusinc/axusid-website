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
  clientId: Scalars['String']['input'];
  providerId: Scalars['String']['input'];
  refreshToken: Scalars['String']['input'];
};

export type SchemaExternalIdentity = {
  __typename?: 'ExternalIdentity';
  createdAt: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  providerId: Scalars['String']['output'];
};

export type SchemaExternalIdentityAccessTokenResponse = {
  __typename?: 'ExternalIdentityAccessTokenResponse';
  accessToken: Scalars['String']['output'];
  expiresIn?: Maybe<Scalars['Int']['output']>;
  scopes: Array<Scalars['String']['output']>;
  tokenType?: Maybe<Scalars['String']['output']>;
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
  delegatePermission: SchemaPermissionGrant;
  deletePasskey: Scalars['Boolean']['output'];
  finishPasskeyRegistration: Scalars['Boolean']['output'];
  linkExternalIdentity: SchemaExternalIdentity;
  loginWithExternalIdentity: SchemaAuthenticatedToken;
  loginWithPasskey: SchemaAuthenticatedToken;
  loginWithPassword: SchemaToken;
  loginWithToken: SchemaToken;
  loginWithTotp: SchemaAuthenticatedToken;
  removeUsername: SchemaUsernames;
  reorderParents: SchemaParents;
  requestParent: SchemaParents;
  revokeGrant: Scalars['Boolean']['output'];
  revokeToken: Scalars['Boolean']['output'];
  setDefaultVariation: SchemaDefaultVariation;
  setPassword: Scalars['Boolean']['output'];
  startPasskeyLogin: SchemaPasskeyCeremony;
  startPasskeyRegistration: SchemaPasskeyCeremony;
  startTotpEnrollment: SchemaTotpEnrollmentResponse;
  unlinkExternalIdentity: Scalars['Boolean']['output'];
  updatePasskeyName: Scalars['Boolean']['output'];
  verifyTotpEnrollment: Scalars['Boolean']['output'];
};


export type SchemaMutationAcceptParentArgs = {
  auid: Scalars['ID']['input'];
  parentAuid: Scalars['ID']['input'];
};


export type SchemaMutationAddUsernameArgs = {
  auid: Scalars['ID']['input'];
  username: Scalars['String']['input'];
};


export type SchemaMutationChangeDefaultUsernameArgs = {
  auid: Scalars['ID']['input'];
  username: Scalars['String']['input'];
};


export type SchemaMutationChangeDescriptionArgs = {
  auid: Scalars['ID']['input'];
  text?: InputMaybe<Scalars['String']['input']>;
  variationId: Scalars['ID']['input'];
};


export type SchemaMutationChangeNameArgs = {
  auid: Scalars['ID']['input'];
  elements: Array<SchemaNameElementInput>;
  variationId: Scalars['ID']['input'];
};


export type SchemaMutationChangeStatusArgs = {
  auid: Scalars['ID']['input'];
  durationMinutes?: InputMaybe<Scalars['Int']['input']>;
  emoji?: InputMaybe<Scalars['String']['input']>;
  expiresAt?: InputMaybe<Scalars['String']['input']>;
  text?: InputMaybe<Scalars['String']['input']>;
  variationId: Scalars['ID']['input'];
};


export type SchemaMutationChangeUsernameArgs = {
  auid: Scalars['ID']['input'];
  newUsername: Scalars['String']['input'];
  oldUsername: Scalars['String']['input'];
};


export type SchemaMutationChangeVariationIconArgs = {
  auid: Scalars['ID']['input'];
  icon?: InputMaybe<Scalars['String']['input']>;
  variationId: Scalars['ID']['input'];
};


export type SchemaMutationChangeVariationLocationIdArgs = {
  auid: Scalars['ID']['input'];
  locationId?: InputMaybe<Scalars['String']['input']>;
  variationId: Scalars['ID']['input'];
};


export type SchemaMutationClearDescriptionArgs = {
  auid: Scalars['ID']['input'];
  variationId: Scalars['ID']['input'];
};


export type SchemaMutationClearStatusArgs = {
  auid: Scalars['ID']['input'];
  variationId: Scalars['ID']['input'];
};


export type SchemaMutationCreateUserArgs = {
  contextAuid?: InputMaybe<Scalars['ID']['input']>;
  registrationKey: Scalars['ID']['input'];
};


export type SchemaMutationCreateVariationArgs = {
  auid: Scalars['ID']['input'];
  description?: InputMaybe<Scalars['String']['input']>;
  icon?: InputMaybe<Scalars['String']['input']>;
  locationId?: InputMaybe<Scalars['String']['input']>;
};


export type SchemaMutationDelegatePermissionArgs = {
  granteeAuid: Scalars['ID']['input'];
  granterAuid: Scalars['ID']['input'];
  permission: Scalars['String']['input'];
};


export type SchemaMutationDeletePasskeyArgs = {
  auid: Scalars['ID']['input'];
  credentialId: Scalars['ID']['input'];
};


export type SchemaMutationFinishPasskeyRegistrationArgs = {
  auid: Scalars['ID']['input'];
  challengeId: Scalars['ID']['input'];
  name?: InputMaybe<Scalars['String']['input']>;
  responseJson: Scalars['String']['input'];
};


export type SchemaMutationLinkExternalIdentityArgs = {
  auid: Scalars['ID']['input'];
  authentication: SchemaExternalAuthenticationInput;
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
};


export type SchemaMutationLoginWithTotpArgs = {
  code: Scalars['String']['input'];
  totpToken: Scalars['String']['input'];
};


export type SchemaMutationRemoveUsernameArgs = {
  auid: Scalars['ID']['input'];
  username: Scalars['String']['input'];
};


export type SchemaMutationReorderParentsArgs = {
  auid: Scalars['ID']['input'];
  parentAuids: Array<Scalars['ID']['input']>;
};


export type SchemaMutationRequestParentArgs = {
  auid: Scalars['ID']['input'];
  parentAuid: Scalars['ID']['input'];
};


export type SchemaMutationRevokeGrantArgs = {
  grantId: Scalars['ID']['input'];
};


export type SchemaMutationSetDefaultVariationArgs = {
  auid: Scalars['ID']['input'];
  variationId: Scalars['ID']['input'];
};


export type SchemaMutationSetPasswordArgs = {
  auid: Scalars['ID']['input'];
  password: Scalars['String']['input'];
};


export type SchemaMutationStartPasskeyLoginArgs = {
  permissions?: InputMaybe<Array<Scalars['String']['input']>>;
  relyingPartyId: Scalars['String']['input'];
};


export type SchemaMutationStartPasskeyRegistrationArgs = {
  auid: Scalars['ID']['input'];
  displayName?: InputMaybe<Scalars['String']['input']>;
  relyingPartyId: Scalars['String']['input'];
};


export type SchemaMutationStartTotpEnrollmentArgs = {
  auid: Scalars['ID']['input'];
  currentCode?: InputMaybe<Scalars['String']['input']>;
};


export type SchemaMutationUnlinkExternalIdentityArgs = {
  auid: Scalars['ID']['input'];
  externalIdentityId: Scalars['ID']['input'];
};


export type SchemaMutationUpdatePasskeyNameArgs = {
  auid: Scalars['ID']['input'];
  credentialId: Scalars['ID']['input'];
  name: Scalars['String']['input'];
};


export type SchemaMutationVerifyTotpEnrollmentArgs = {
  auid: Scalars['ID']['input'];
  code: Scalars['String']['input'];
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
  hasNextPage: Scalars['Boolean']['output'];
  items: Array<SchemaIdentity>;
  nextCursor?: Maybe<Scalars['ID']['output']>;
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

export type SchemaPasskeyCredential = {
  __typename?: 'PasskeyCredential';
  auid: Scalars['ID']['output'];
  backedUp: Scalars['Boolean']['output'];
  backupEligible: Scalars['Boolean']['output'];
  createdAt: Scalars['String']['output'];
  credentialId: Scalars['ID']['output'];
  lastUsedAt?: Maybe<Scalars['String']['output']>;
  name?: Maybe<Scalars['String']['output']>;
  transports: Array<Scalars['String']['output']>;
};

export type SchemaPermissionCheck = {
  __typename?: 'PermissionCheck';
  allowed: Scalars['Boolean']['output'];
  reason: Scalars['String']['output'];
};

export type SchemaPermissionGrant = {
  __typename?: 'PermissionGrant';
  activationState: SchemaPermissionGrantActivationState;
  effect: SchemaPermissionGrantEffect;
  granteeAuid: Scalars['ID']['output'];
  id: Scalars['ID']['output'];
  isShadow: Scalars['Boolean']['output'];
  origin: SchemaPermissionGrantOrigin;
  permission: Scalars['String']['output'];
};

export enum SchemaPermissionGrantActivationState {
  Active = 'ACTIVE',
  Inactive = 'INACTIVE',
  RequiresApproval = 'REQUIRES_APPROVAL',
  TemporarilyActive = 'TEMPORARILY_ACTIVE'
}

export enum SchemaPermissionGrantEffect {
  Allow = 'ALLOW',
  Deny = 'DENY'
}

export type SchemaPermissionGrantOrigin = {
  __typename?: 'PermissionGrantOrigin';
  delegatorAuid?: Maybe<Scalars['ID']['output']>;
  delegatorTokenId?: Maybe<Scalars['ID']['output']>;
  type: SchemaPermissionGrantOriginType;
};

export enum SchemaPermissionGrantOriginType {
  Delegated = 'DELEGATED',
  DelegatedByToken = 'DELEGATED_BY_TOKEN',
  Direct = 'DIRECT'
}

export type SchemaQuery = {
  __typename?: 'Query';
  checkPermission: SchemaPermissionCheck;
  defaultVariation?: Maybe<SchemaDefaultVariation>;
  delegatedGrants: Array<SchemaPermissionGrant>;
  description?: Maybe<SchemaDescription>;
  externalIdentities: Array<SchemaExternalIdentity>;
  externalIdentityAccessToken: SchemaExternalIdentityAccessTokenResponse;
  grants: Array<SchemaPermissionGrant>;
  identities: SchemaPaginatedIdentities;
  isPasswordSet: Scalars['Boolean']['output'];
  name?: Maybe<SchemaName>;
  ownerByUsername?: Maybe<Scalars['ID']['output']>;
  parents?: Maybe<SchemaParents>;
  passkeys: Array<SchemaPasskeyCredential>;
  status?: Maybe<SchemaStatus>;
  user?: Maybe<SchemaUser>;
  usernames?: Maybe<SchemaUsernames>;
  variations: Array<SchemaVariation>;
};


export type SchemaQueryCheckPermissionArgs = {
  auid: Scalars['ID']['input'];
  permission: Scalars['String']['input'];
};


export type SchemaQueryDefaultVariationArgs = {
  auid: Scalars['ID']['input'];
};


export type SchemaQueryDelegatedGrantsArgs = {
  auid: Scalars['ID']['input'];
};


export type SchemaQueryDescriptionArgs = {
  variationId: Scalars['ID']['input'];
};


export type SchemaQueryExternalIdentitiesArgs = {
  auid: Scalars['ID']['input'];
};


export type SchemaQueryExternalIdentityAccessTokenArgs = {
  auid: Scalars['ID']['input'];
  externalIdentityId: Scalars['ID']['input'];
};


export type SchemaQueryGrantsArgs = {
  auid: Scalars['ID']['input'];
};


export type SchemaQueryIdentitiesArgs = {
  contextAuid: Scalars['ID']['input'];
  cursor?: InputMaybe<Scalars['ID']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  recursive?: InputMaybe<Scalars['Boolean']['input']>;
};


export type SchemaQueryIsPasswordSetArgs = {
  auid: Scalars['ID']['input'];
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


export type SchemaQueryPasskeysArgs = {
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

export type ExternalAuthenticationInput = {
  clientId: string;
  providerId: string;
  refreshToken: string;
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

export type PermissionGrantActivationState =
  | 'ACTIVE'
  | 'INACTIVE'
  | 'REQUIRES_APPROVAL'
  | 'TEMPORARILY_ACTIVE';

export type PermissionGrantEffect =
  | 'ALLOW'
  | 'DENY';

export type LoginWithPasswordMutationVariables = Exact<{
  auid: string | number;
  password: string;
  permissions?: Array<string> | string | null | undefined;
}>;


export type LoginWithPasswordMutation = { loginWithPassword: { id: string } };

export type CreateUserMutationVariables = Exact<{
  contextAuid?: string | number | null | undefined;
  registrationKey: string | number;
}>;


export type CreateUserMutation = { createUser: { auid: string, token: { id: string } } };

export type SetPasswordMutationVariables = Exact<{
  auid: string | number;
  password: string;
}>;


export type SetPasswordMutation = { setPassword: boolean };

export type IsPasswordSetQueryVariables = Exact<{
  auid: string | number;
}>;


export type IsPasswordSetQuery = { isPasswordSet: boolean };

export type LoginWithExternalIdentityMutationVariables = Exact<{
  authentication: ExternalAuthenticationInput;
  permissions?: Array<string> | string | null | undefined;
}>;


export type LoginWithExternalIdentityMutation = { loginWithExternalIdentity: { id: string, auid: string } };

export type LinkExternalIdentityMutationVariables = Exact<{
  auid: string | number;
  authentication: ExternalAuthenticationInput;
}>;


export type LinkExternalIdentityMutation = { linkExternalIdentity: { id: string, providerId: string, createdAt: string } };

export type LoginWithTokenMutationVariables = Exact<{
  auid: string | number;
  permissions?: Array<string> | string | null | undefined;
}>;


export type LoginWithTokenMutation = { loginWithToken: { id: string } };

export type RevokeTokenMutationVariables = Exact<{ [key: string]: never; }>;


export type RevokeTokenMutation = { revokeToken: boolean };

export type PasskeysQueryVariables = Exact<{
  auid: string | number;
}>;


export type PasskeysQuery = { passkeys: Array<{ credentialId: string, auid: string, name: string | null, transports: Array<string>, backupEligible: boolean, backedUp: boolean, createdAt: string, lastUsedAt: string | null }> };

export type StartPasskeyRegistrationMutationVariables = Exact<{
  auid: string | number;
  displayName?: string | null | undefined;
  relyingPartyId: string;
}>;


export type StartPasskeyRegistrationMutation = { startPasskeyRegistration: { challengeId: string, optionsJson: string } };

export type FinishPasskeyRegistrationMutationVariables = Exact<{
  auid: string | number;
  challengeId: string | number;
  responseJson: string;
  name?: string | null | undefined;
}>;


export type FinishPasskeyRegistrationMutation = { finishPasskeyRegistration: boolean };

export type UpdatePasskeyNameMutationVariables = Exact<{
  auid: string | number;
  credentialId: string | number;
  name: string;
}>;


export type UpdatePasskeyNameMutation = { updatePasskeyName: boolean };

export type DeletePasskeyMutationVariables = Exact<{
  auid: string | number;
  credentialId: string | number;
}>;


export type DeletePasskeyMutation = { deletePasskey: boolean };

export type StartPasskeyLoginMutationVariables = Exact<{
  permissions?: Array<string> | string | null | undefined;
  relyingPartyId: string;
}>;


export type StartPasskeyLoginMutation = { startPasskeyLogin: { challengeId: string, optionsJson: string } };

export type LoginWithPasskeyMutationVariables = Exact<{
  challengeId: string | number;
  responseJson: string;
}>;


export type LoginWithPasskeyMutation = { loginWithPasskey: { id: string, auid: string } };

export type MyGrantsQueryVariables = Exact<{
  auid: string | number;
}>;


export type MyGrantsQuery = { grants: Array<{ permission: string }> };

export type MyDelegatedGrantsQueryVariables = Exact<{
  auid: string | number;
}>;


export type MyDelegatedGrantsQuery = { delegatedGrants: Array<{ id: string, granteeAuid: string, permission: string, effect: PermissionGrantEffect, activationState: PermissionGrantActivationState, isShadow: boolean }> };

export type EffectivePermissionQueryVariables = Exact<{
  auid: string | number;
  permission: string;
}>;


export type EffectivePermissionQuery = { checkPermission: { allowed: boolean } };

export type SharePermissionMutationVariables = Exact<{
  granterAuid: string | number;
  granteeAuid: string | number;
  permission: string;
}>;


export type SharePermissionMutation = { delegatePermission: { id: string, granteeAuid: string, permission: string, effect: PermissionGrantEffect, activationState: PermissionGrantActivationState, isShadow: boolean } };

export type RemoveSharedPermissionMutationVariables = Exact<{
  grantId: string | number;
}>;


export type RemoveSharedPermissionMutation = { revokeGrant: boolean };

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
}>;


export type ExternalIdentitiesQuery = { externalIdentities: Array<{ id: string, providerId: string, createdAt: string }> };

export type ExternalIdentityAccessTokenQueryVariables = Exact<{
  auid: string | number;
  externalIdentityId: string | number;
}>;


export type ExternalIdentityAccessTokenQuery = { externalIdentityAccessToken: { accessToken: string, tokenType: string | null, expiresIn: number | null, scopes: Array<string> } };

export type UnlinkExternalIdentityMutationVariables = Exact<{
  auid: string | number;
  externalIdentityId: string | number;
}>;


export type UnlinkExternalIdentityMutation = { unlinkExternalIdentity: boolean };


export const LoginWithPasswordDocument = gql`
    mutation LoginWithPassword($auid: ID!, $password: String!, $permissions: [String!]) {
  loginWithPassword(auid: $auid, password: $password, permissions: $permissions) {
    id
  }
}
    `;
export const CreateUserDocument = gql`
    mutation CreateUser($contextAuid: ID, $registrationKey: ID!) {
  createUser(contextAuid: $contextAuid, registrationKey: $registrationKey) {
    auid
    token {
      id
    }
  }
}
    `;
export const SetPasswordDocument = gql`
    mutation SetPassword($auid: ID!, $password: String!) {
  setPassword(auid: $auid, password: $password)
}
    `;
export const IsPasswordSetDocument = gql`
    query IsPasswordSet($auid: ID!) {
  isPasswordSet(auid: $auid)
}
    `;
export const LoginWithExternalIdentityDocument = gql`
    mutation LoginWithExternalIdentity($authentication: ExternalAuthenticationInput!, $permissions: [String!]) {
  loginWithExternalIdentity(
    authentication: $authentication
    permissions: $permissions
  ) {
    id
    auid
  }
}
    `;
export const LinkExternalIdentityDocument = gql`
    mutation LinkExternalIdentity($auid: ID!, $authentication: ExternalAuthenticationInput!) {
  linkExternalIdentity(auid: $auid, authentication: $authentication) {
    id
    providerId
    createdAt
  }
}
    `;
export const LoginWithTokenDocument = gql`
    mutation LoginWithToken($auid: ID!, $permissions: [String!]) {
  loginWithToken(auid: $auid, permissions: $permissions) {
    id
  }
}
    `;
export const RevokeTokenDocument = gql`
    mutation RevokeToken {
  revokeToken
}
    `;
export const PasskeysDocument = gql`
    query Passkeys($auid: ID!) {
  passkeys(auid: $auid) {
    credentialId
    auid
    name
    transports
    backupEligible
    backedUp
    createdAt
    lastUsedAt
  }
}
    `;
export const StartPasskeyRegistrationDocument = gql`
    mutation StartPasskeyRegistration($auid: ID!, $displayName: String, $relyingPartyId: String!) {
  startPasskeyRegistration(
    auid: $auid
    displayName: $displayName
    relyingPartyId: $relyingPartyId
  ) {
    challengeId
    optionsJson
  }
}
    `;
export const FinishPasskeyRegistrationDocument = gql`
    mutation FinishPasskeyRegistration($auid: ID!, $challengeId: ID!, $responseJson: String!, $name: String) {
  finishPasskeyRegistration(
    auid: $auid
    challengeId: $challengeId
    responseJson: $responseJson
    name: $name
  )
}
    `;
export const UpdatePasskeyNameDocument = gql`
    mutation UpdatePasskeyName($auid: ID!, $credentialId: ID!, $name: String!) {
  updatePasskeyName(auid: $auid, credentialId: $credentialId, name: $name)
}
    `;
export const DeletePasskeyDocument = gql`
    mutation DeletePasskey($auid: ID!, $credentialId: ID!) {
  deletePasskey(auid: $auid, credentialId: $credentialId)
}
    `;
export const StartPasskeyLoginDocument = gql`
    mutation StartPasskeyLogin($permissions: [String!], $relyingPartyId: String!) {
  startPasskeyLogin(permissions: $permissions, relyingPartyId: $relyingPartyId) {
    challengeId
    optionsJson
  }
}
    `;
export const LoginWithPasskeyDocument = gql`
    mutation LoginWithPasskey($challengeId: ID!, $responseJson: String!) {
  loginWithPasskey(challengeId: $challengeId, responseJson: $responseJson) {
    id
    auid
  }
}
    `;
export const MyGrantsDocument = gql`
    query MyGrants($auid: ID!) {
  grants(auid: $auid) {
    permission
  }
}
    `;
export const MyDelegatedGrantsDocument = gql`
    query MyDelegatedGrants($auid: ID!) {
  delegatedGrants(auid: $auid) {
    id
    granteeAuid
    permission
    effect
    activationState
    isShadow
  }
}
    `;
export const EffectivePermissionDocument = gql`
    query EffectivePermission($auid: ID!, $permission: String!) {
  checkPermission(auid: $auid, permission: $permission) {
    allowed
  }
}
    `;
export const SharePermissionDocument = gql`
    mutation SharePermission($granterAuid: ID!, $granteeAuid: ID!, $permission: String!) {
  delegatePermission(
    granterAuid: $granterAuid
    granteeAuid: $granteeAuid
    permission: $permission
  ) {
    id
    granteeAuid
    permission
    effect
    activationState
    isShadow
  }
}
    `;
export const RemoveSharedPermissionDocument = gql`
    mutation RemoveSharedPermission($grantId: ID!) {
  revokeGrant(grantId: $grantId)
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
    query ExternalIdentities($auid: ID!) {
  externalIdentities(auid: $auid) {
    id
    providerId
    createdAt
  }
}
    `;
export const ExternalIdentityAccessTokenDocument = gql`
    query ExternalIdentityAccessToken($auid: ID!, $externalIdentityId: ID!) {
  externalIdentityAccessToken(
    auid: $auid
    externalIdentityId: $externalIdentityId
  ) {
    accessToken
    tokenType
    expiresIn
    scopes
  }
}
    `;
export const UnlinkExternalIdentityDocument = gql`
    mutation UnlinkExternalIdentity($auid: ID!, $externalIdentityId: ID!) {
  unlinkExternalIdentity(auid: $auid, externalIdentityId: $externalIdentityId)
}
    `;

export type SdkFunctionWrapper = <T>(action: (requestHeaders?:Record<string, string>) => Promise<T>, operationName: string, operationType?: string, variables?: any) => Promise<T>;


const defaultWrapper: SdkFunctionWrapper = (action, _operationName, _operationType, _variables) => action();

export function getSdk(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  return {
    LoginWithPassword(variables: LoginWithPasswordMutationVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<LoginWithPasswordMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<LoginWithPasswordMutation>({ document: LoginWithPasswordDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'LoginWithPassword', 'mutation', variables);
    },
    CreateUser(variables: CreateUserMutationVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<CreateUserMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<CreateUserMutation>({ document: CreateUserDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'CreateUser', 'mutation', variables);
    },
    SetPassword(variables: SetPasswordMutationVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<SetPasswordMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<SetPasswordMutation>({ document: SetPasswordDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'SetPassword', 'mutation', variables);
    },
    IsPasswordSet(variables: IsPasswordSetQueryVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<IsPasswordSetQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<IsPasswordSetQuery>({ document: IsPasswordSetDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'IsPasswordSet', 'query', variables);
    },
    LoginWithExternalIdentity(variables: LoginWithExternalIdentityMutationVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<LoginWithExternalIdentityMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<LoginWithExternalIdentityMutation>({ document: LoginWithExternalIdentityDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'LoginWithExternalIdentity', 'mutation', variables);
    },
    LinkExternalIdentity(variables: LinkExternalIdentityMutationVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<LinkExternalIdentityMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<LinkExternalIdentityMutation>({ document: LinkExternalIdentityDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'LinkExternalIdentity', 'mutation', variables);
    },
    LoginWithToken(variables: LoginWithTokenMutationVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<LoginWithTokenMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<LoginWithTokenMutation>({ document: LoginWithTokenDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'LoginWithToken', 'mutation', variables);
    },
    RevokeToken(variables?: RevokeTokenMutationVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<RevokeTokenMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<RevokeTokenMutation>({ document: RevokeTokenDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'RevokeToken', 'mutation', variables);
    },
    Passkeys(variables: PasskeysQueryVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<PasskeysQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<PasskeysQuery>({ document: PasskeysDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'Passkeys', 'query', variables);
    },
    StartPasskeyRegistration(variables: StartPasskeyRegistrationMutationVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<StartPasskeyRegistrationMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<StartPasskeyRegistrationMutation>({ document: StartPasskeyRegistrationDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'StartPasskeyRegistration', 'mutation', variables);
    },
    FinishPasskeyRegistration(variables: FinishPasskeyRegistrationMutationVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<FinishPasskeyRegistrationMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<FinishPasskeyRegistrationMutation>({ document: FinishPasskeyRegistrationDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'FinishPasskeyRegistration', 'mutation', variables);
    },
    UpdatePasskeyName(variables: UpdatePasskeyNameMutationVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<UpdatePasskeyNameMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<UpdatePasskeyNameMutation>({ document: UpdatePasskeyNameDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'UpdatePasskeyName', 'mutation', variables);
    },
    DeletePasskey(variables: DeletePasskeyMutationVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<DeletePasskeyMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<DeletePasskeyMutation>({ document: DeletePasskeyDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'DeletePasskey', 'mutation', variables);
    },
    StartPasskeyLogin(variables: StartPasskeyLoginMutationVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<StartPasskeyLoginMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<StartPasskeyLoginMutation>({ document: StartPasskeyLoginDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'StartPasskeyLogin', 'mutation', variables);
    },
    LoginWithPasskey(variables: LoginWithPasskeyMutationVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<LoginWithPasskeyMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<LoginWithPasskeyMutation>({ document: LoginWithPasskeyDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'LoginWithPasskey', 'mutation', variables);
    },
    MyGrants(variables: MyGrantsQueryVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<MyGrantsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<MyGrantsQuery>({ document: MyGrantsDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'MyGrants', 'query', variables);
    },
    MyDelegatedGrants(variables: MyDelegatedGrantsQueryVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<MyDelegatedGrantsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<MyDelegatedGrantsQuery>({ document: MyDelegatedGrantsDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'MyDelegatedGrants', 'query', variables);
    },
    EffectivePermission(variables: EffectivePermissionQueryVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<EffectivePermissionQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<EffectivePermissionQuery>({ document: EffectivePermissionDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'EffectivePermission', 'query', variables);
    },
    SharePermission(variables: SharePermissionMutationVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<SharePermissionMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<SharePermissionMutation>({ document: SharePermissionDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'SharePermission', 'mutation', variables);
    },
    RemoveSharedPermission(variables: RemoveSharedPermissionMutationVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<RemoveSharedPermissionMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<RemoveSharedPermissionMutation>({ document: RemoveSharedPermissionDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'RemoveSharedPermission', 'mutation', variables);
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
    ExternalIdentityAccessToken(variables: ExternalIdentityAccessTokenQueryVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<ExternalIdentityAccessTokenQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<ExternalIdentityAccessTokenQuery>({ document: ExternalIdentityAccessTokenDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'ExternalIdentityAccessToken', 'query', variables);
    },
    UnlinkExternalIdentity(variables: UnlinkExternalIdentityMutationVariables, requestHeaders?: GraphQLClientRequestHeaders, signal?: RequestInit['signal']): Promise<UnlinkExternalIdentityMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<UnlinkExternalIdentityMutation>({ document: UnlinkExternalIdentityDocument, variables, requestHeaders: { ...requestHeaders, ...wrappedRequestHeaders }, signal }), 'UnlinkExternalIdentity', 'mutation', variables);
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;