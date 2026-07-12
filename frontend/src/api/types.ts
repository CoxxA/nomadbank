import type { components, paths } from './schema.gen'

type Schemas = components['schemas']

export type SetupStatus = paths['/setup']['get']['responses'][200]['content']['application/json']
export type SetupInput = Schemas['SetupInput']
export type Owner = Schemas['Owner']
export type Account = Schemas['Account']
export type AccountInput = Schemas['AccountInput']
export type Strategy = Schemas['Strategy']
export type StrategyInput = Schemas['StrategyInput']
export type TaskBatch = Schemas['TaskBatch']
export type Task = Schemas['Task']
export type TaskStatus = Task['status']
export type TaskPage = Schemas['TaskPage']
export type Dashboard = Schemas['Dashboard']

export type GenerateBatchInput =
  paths['/task-batches']['post']['requestBody']['content']['application/json']
export type GenerateResult =
  paths['/task-batches']['post']['responses'][201]['content']['application/json']
