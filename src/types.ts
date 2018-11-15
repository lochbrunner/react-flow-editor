import {Vector2d} from './geometry';

export interface Size {
  width: number;
  height: number;
}

export interface Node {
  name: string;
  type: string;
  id: string;
  payload: any;
  inputs: BaseInput[];
  outputs: BaseOutput[];
  position?: Vector2d;
  properties?: {display: 'stacked' | 'only-dots'};
  classNames?: string[];
}

export interface Connection {
  /**
   * The other node id which to connect
   */
  nodeId: string;
  /**
   * The id of the property to connect
   */
  port: number;
}

export interface BaseConnection {
  name: string;
  connection?: Connection|Connection[];
  payload?: any;
  renderer?: (connection: BaseConnection) => JSX.Element;
}

export type BaseInput = BaseConnection&{};

export type BaseOutput = BaseConnection&{};