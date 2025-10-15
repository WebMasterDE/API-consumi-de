import * as Sequelize from 'sequelize';
import { DataTypes, Model, Optional } from 'sequelize';
import type { letture_inverter, letture_inverterId } from './letture_inverter';

export interface tipo_datoAttributes {
  id: number;
  codice: string;
  nome?: string;
  unita_misura: string;
}

export type tipo_datoPk = "id";
export type tipo_datoId = tipo_dato[tipo_datoPk];
export type tipo_datoOptionalAttributes = "id" | "nome" | "unita_misura";
export type tipo_datoCreationAttributes = Optional<tipo_datoAttributes, tipo_datoOptionalAttributes>;

export class tipo_dato extends Model<tipo_datoAttributes, tipo_datoCreationAttributes> implements tipo_datoAttributes {
  id!: number;
  codice!: string;
  nome?: string;
  unita_misura!: string;

  // tipo_dato hasMany letture_inverter via id_dato
  letture_inverters!: letture_inverter[];
  getLetture_inverters!: Sequelize.HasManyGetAssociationsMixin<letture_inverter>;
  setLetture_inverters!: Sequelize.HasManySetAssociationsMixin<letture_inverter, letture_inverterId>;
  addLetture_inverter!: Sequelize.HasManyAddAssociationMixin<letture_inverter, letture_inverterId>;
  addLetture_inverters!: Sequelize.HasManyAddAssociationsMixin<letture_inverter, letture_inverterId>;
  createLetture_inverter!: Sequelize.HasManyCreateAssociationMixin<letture_inverter>;
  removeLetture_inverter!: Sequelize.HasManyRemoveAssociationMixin<letture_inverter, letture_inverterId>;
  removeLetture_inverters!: Sequelize.HasManyRemoveAssociationsMixin<letture_inverter, letture_inverterId>;
  hasLetture_inverter!: Sequelize.HasManyHasAssociationMixin<letture_inverter, letture_inverterId>;
  hasLetture_inverters!: Sequelize.HasManyHasAssociationsMixin<letture_inverter, letture_inverterId>;
  countLetture_inverters!: Sequelize.HasManyCountAssociationsMixin;

  static initModel(sequelize: Sequelize.Sequelize): typeof tipo_dato {
    return tipo_dato.init({
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    codice: {
      type: DataTypes.STRING,
      allowNull: false
    },
    nome: {
      type: DataTypes.STRING,
      allowNull: true
    },
    unita_misura: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "Wh"
    }
  }, {
    sequelize,
    tableName: 'tipo_dato',
    schema: 'public',
    timestamps: false,
    indexes: [
      {
        name: "tipo_dato_pk",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
    ]
  });
  }
}
