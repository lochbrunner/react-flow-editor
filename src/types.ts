import {ChangeAction} from './change-api';
import {Vector2d} from './geometry';

export interface Size {
  width: number;
  height: number;
}

export interface Config {
  resolver: (node: Node) => JSX.Element;
  connectionValidator?:
      (output: {nodeId: string, port: number},
       input: {nodeId: string, port: number}) => boolean;
  /**
   * Callback when changes to the Graph are made by the user
   * Call updateProps, if you want the editor managing the state change
   */
  onChanged?: (node: ChangeAction, updateProps: () => void) => void;

  /**
   * If this is set, the editor will change the props.
   * Deprecated: Use the "updateProps" in onChanged instead.
   */
  demoMode?: boolean;
  /**
   * Default is 'bezier'
   */
  connectionType?: 'bezier'|'linear';
  /**
   * Default is true. Which results in a grid.size of 18
   */
  grid?: boolean|{size: number};
  connectionAnchorsLength?: number;
  /**
   * Default is 'we'
   */
  direction?: 'ew'|'we';
}

export interface Node {
  name: string;
  type: string;
  id: string;
  payload?: any;
  inputs: InputPort[];
  outputs: OutputPort[];
  position?: Vector2d;
  properties?: {display: 'stacked' | 'only-dots'};
  classNames?: string[];
  isCollapsed?: boolean;
}
/**
 * Connection endpoint
 * Each connection is defined by a Port and a Connection
 * Which describes the Node+Port of the other endpoint of that connection
 */

export interface Connection {
  /**
   * The other node id which to connect
   */
  nodeId: string;
  /**
   * The id of the property to connect
   */
  port: number;
  /**
   * Example UC: mark invalid connections
   */
  classNames?: string[];
  /**
   * Will be printed as title
   */
  notes?: string;
}

/**
 * Each connection is between two ports
 */
export interface Port {
  name: string;
  connection?: Connection|
      Connection[];  // Should this be restricted to arrays only?
  payload?: any;     // No UseCase up to now
  renderer?: (connection: Port) => JSX.Element;  // No UseCase up to now
}

export type InputPort = Port&{};  // No UseCase up to now

export type OutputPort = Port&{};  // No UseCase up to now