import { createContext } from 'react';
import { readBackup, restoreBackup } from './database';

export const BackupContext = createContext({ readBackup, restoreBackup, cloud: false });
