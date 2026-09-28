export const permissionApiSignatures = `# Queries
checkPermission(auid: ID!, permission: String!, permissionContext: ID): PermissionCheck!
permissionDeclarations(contextAuid: ID!): [PermissionDeclaration!]!
describePermission(contextAuid: ID!, permission: String!): DescribedPermission!
permissionTree(contextAuid: ID!): [PermissionTreeNode!]!
searchPermissionValues(contextAuid: ID!, declarationId: ID!, param: String!, query: String!, limit: Int): ParamOption!

# Mutations
delegatePermission(granterAuid: ID!, granteeAuid: ID!, permission: String!, permissionContext: ID): PermissionGrant!
publishPermissionDeclaration(ownerAuid: ID!, declaration: PermissionDeclarationInput!): PermissionDeclaration!
notifyValidationChanged(declarationId: ID!): Boolean!`;

export const permissionDiscoveryExample = `query DiscoverPermissions($app: ID!) {
  permissionDeclarations(contextAuid: $app) {
    id context name version template title description icon validatorUrl
  }
  permissionTree(contextAuid: $app) {
    keyPrefix title
    children {
      keyPrefix title declarations
      params {
        name label dynamic degraded
        values { value label icon description }
      }
    }
  }
}`;
export const permissionPreviewExample = `query PreviewPermission($app: ID!, $account: ID!, $key: String!) {
  describePermission(contextAuid: $app, permission: $key) {
    key context declarationId title description icon
    params { name value label description icon hint valueLabel valueIcon }
  }
  checkPermission(auid: $account, permission: $key, permissionContext: $app) {
    allowed reason
  }
}`;
export const permissionShareExample = `mutation SharePermission($from: ID!, $to: ID!, $app: ID!, $key: String!) {
  delegatePermission(granterAuid: $from, granteeAuid: $to,
    permission: $key, permissionContext: $app) {
    id permission permissionContext granteeAuid activationState
  }
}`;
export const permissionPublishExample = `mutation PublishPermission($owner: ID!, $declaration: PermissionDeclarationInput!) {
  publishPermissionDeclaration(ownerAuid: $owner, declaration: $declaration) {
    id context name version template title description icon validatorUrl
  }
}`;
export const permissionSearchExample = `query SearchValues($app: ID!, $declaration: ID!, $query: String!) {
  searchPermissionValues(contextAuid: $app, declarationId: $declaration,
    param: "subject", query: $query, limit: 20) {
    name label dynamic degraded
    values { value label icon description }
  }
}`;
export const permissionInvalidateExample = `mutation InvalidateValidation($declaration: ID!) {
  notifyValidationChanged(declarationId: $declaration)
}`;
