const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const User = sequelize.define(
    'User',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      full_name: { type: DataTypes.STRING(120), allowNull: false },
      email: { type: DataTypes.STRING(180), allowNull: false, unique: true },
      phone: { type: DataTypes.STRING(20), allowNull: true, unique: true },
      password_hash: { type: DataTypes.STRING(255), allowNull: false },
      status: {
        type: DataTypes.ENUM('active', 'inactive', 'suspended'),
        allowNull: false,
        defaultValue: 'active',
      },
      is_email_verified: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      last_login_at: { type: DataTypes.DATE, allowNull: true },
    },
    { tableName: 'users' }
  );

  const Role = sequelize.define(
    'Role',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      name: { type: DataTypes.STRING(80), allowNull: false },
      slug: { type: DataTypes.STRING(80), allowNull: false, unique: true },
      description: { type: DataTypes.STRING(255), allowNull: true },
      is_system: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    { tableName: 'roles' }
  );

  const Permission = sequelize.define(
    'Permission',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      name: { type: DataTypes.STRING(100), allowNull: false },
      slug: { type: DataTypes.STRING(100), allowNull: false, unique: true },
      module: { type: DataTypes.STRING(60), allowNull: false },
      description: { type: DataTypes.STRING(255), allowNull: true },
    },
    { tableName: 'permissions' }
  );

  const UserRole = sequelize.define(
    'UserRole',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      user_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      role_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    },
    { tableName: 'user_roles' }
  );

  const RolePermission = sequelize.define(
    'RolePermission',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      role_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      permission_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    },
    { tableName: 'role_permissions' }
  );

  const RefreshToken = sequelize.define(
    'RefreshToken',
    {
      id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      user_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
      token_hash: { type: DataTypes.STRING(255), allowNull: false, unique: true },
      user_agent: { type: DataTypes.STRING(255), allowNull: true },
      ip_address: { type: DataTypes.STRING(64), allowNull: true },
      expires_at: { type: DataTypes.DATE, allowNull: false },
      revoked_at: { type: DataTypes.DATE, allowNull: true },
      replaced_by_token_hash: { type: DataTypes.STRING(255), allowNull: true },
    },
    { tableName: 'refresh_tokens' }
  );

  return { User, Role, Permission, UserRole, RolePermission, RefreshToken };
};
