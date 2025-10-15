import * as Sequelize from 'sequelize';
import { DataTypes, Model, Optional } from 'sequelize';

export interface dispositiviAttributes {
  id: number;
  id_dispositivo: string;
}

export type dispositiviPk = "id";
export type dispositiviId = dispositivi[dispositiviPk];
export type dispositiviOptionalAttributes = "id";
export type dispositiviCreationAttributes = Optional<dispositiviAttributes, dispositiviOptionalAttributes>;

export class dispositivi extends Model<dispositiviAttributes, dispositiviCreationAttributes> implements dispositiviAttributes {
  id!: number;
  id_dispositivo!: string;


  static initModel(sequelize: Sequelize.Sequelize): typeof dispositivi {
    return dispositivi.init({
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    id_dispositivo: {
      type: DataTypes.STRING,
      allowNull: false
    }
  }, {
    sequelize,
    tableName: 'dispositivi',
    schema: 'public',
    timestamps: false,
    indexes: [
      {
        name: "dispositivi_pk",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
    ]
  });
  }
}
