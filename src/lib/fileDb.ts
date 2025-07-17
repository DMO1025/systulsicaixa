
'use server';

import fs from 'node:fs/promises';
import path from 'node:path';
import type { DailyLogEntry, PeriodData, EventosPeriodData, Settings, User } from './types';
import { PERIOD_DEFINITIONS } from '@/lib/config/periods';
import { format, parseISO, isValid } from 'date-fns';

const DATA_DIR = path.join(process.cwd(), 'data');
const DAILY_ENTRIES_FILE_PATH = path.join(DATA_DIR, 'dailyEntries.json');
const SETTINGS_FILE_PATH = path.join(DATA_DIR, 'settings.json');
const USERS_FILE_PATH = path.join(DATA_DIR, 'users.json');

async function ensureDataDir(): Promise<void> {
  try {
    await fs.access(DATA_DIR);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }
}

function processEntryFromFile(entry: any): DailyLogEntry {
  const processedEntry = { ...entry };

  if (processedEntry.date && typeof processedEntry.date === 'string') {
    const parsedDate = parseISO(processedEntry.date);
    if (isValid(parsedDate)) {
      processedEntry.date = parsedDate;
    } else {
      console.warn(`Invalid date string in JSON for entry ID ${processedEntry.id}: ${entry.date}`);
    }
  }

  PERIOD_DEFINITIONS.forEach(pDef => {
    const periodKey = pDef.id as keyof DailyLogEntry;
    if (processedEntry[periodKey] && typeof processedEntry[periodKey] === 'string') {
      try {
        const parsedData = JSON.parse(processedEntry[periodKey] as string);
        processedEntry[periodKey] = parsedData;
      } catch (e) {
        console.error(`Error parsing JSON string for period ${pDef.id} in entry ${processedEntry.id} from file:`, e);
      }
    }
    if (pDef.id === 'eventos' && processedEntry.eventos && typeof processedEntry.eventos === 'object') {
        const eventosData = processedEntry.eventos as EventosPeriodData;
        if (!Array.isArray(eventosData.items)) {
            eventosData.items = [];
        } else {
            eventosData.items = eventosData.items.map(item => ({
                ...item,
                subEvents: Array.isArray(item.subEvents) ? item.subEvents : [],
            }));
        }
    }
  });

  return processedEntry as DailyLogEntry;
}


export async function readDailyEntriesFile(): Promise<DailyLogEntry[]> {
  await ensureDataDir();
  try {
    const fileContent = await fs.readFile(DAILY_ENTRIES_FILE_PATH, 'utf-8');
    const entriesArray: any[] = JSON.parse(fileContent);
    return entriesArray.map(processEntryFromFile);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      await fs.writeFile(DAILY_ENTRIES_FILE_PATH, JSON.stringify([], null, 2));
      return [];
    }
    console.error('Error reading daily entries file:', error);
    throw new Error('Failed to read daily entries data.');
  }
}

export async function writeDailyEntriesFile(entries: DailyLogEntry[]): Promise<void> {
  await ensureDataDir();
  try {
    const entriesToSave = entries.map(entry => {
      const entryForFile = { ...entry } as any;
      if (entryForFile.date instanceof Date && isValid(entryForFile.date)) {
        entryForFile.date = format(entryForFile.date, 'yyyy-MM-dd');
      }
      PERIOD_DEFINITIONS.forEach(pDef => {
        const periodKey = pDef.id as keyof DailyLogEntry;
        if (entryForFile[periodKey] && typeof entryForFile[periodKey] === 'object') {
          entryForFile[periodKey] = JSON.stringify(entryForFile[periodKey]);
        }
      });
      return entryForFile;
    });
    await fs.writeFile(DAILY_ENTRIES_FILE_PATH, JSON.stringify(entriesToSave, null, 2));
  } catch (error) {
    console.error('Error writing daily entries file:', error);
    throw new Error('Failed to write daily entries data.');
  }
}

export async function getDailyEntryFromFile(dateId: string): Promise<DailyLogEntry | null> {
  const entries = await readDailyEntriesFile();
  const entry = entries.find(e => e.id === dateId);
  return entry ? processEntryFromFile(entry) : null;
}

export async function saveDailyEntryToFile(entryData: DailyLogEntry): Promise<DailyLogEntry> {
  const entries = await readDailyEntriesFile();
  const entryIndex = entries.findIndex(e => e.id === entryData.id);

  const entryToSave = { ...entryData } as any;
  if (entryToSave.date instanceof Date && isValid(entryToSave.date)) {
     entryToSave.date = format(entryToSave.date, 'yyyy-MM-dd');
  } else if (typeof entryToSave.date === 'string') {
      const parsed = parseISO(entryToSave.date);
      if (isValid(parsed)) {
          entryToSave.date = format(parsed, 'yyyy-MM-dd');
      }
  }
  entryToSave.id = entryToSave.date;


  if (entryIndex > -1) {
    entries[entryIndex] = { ...entries[entryIndex], ...entryToSave, lastModifiedAt: new Date().toISOString() };
  } else {
    entries.push({ ...entryToSave, createdAt: new Date().toISOString(), lastModifiedAt: new Date().toISOString() });
  }
  
  entries.sort((a, b) => {
    const dateA = a.date instanceof Date ? a.date : parseISO(a.date as string);
    const dateB = b.date instanceof Date ? b.date : parseISO(b.date as string);
    if (!isValid(dateA) || !isValid(dateB)) return 0;
    return dateA.getTime() - dateB.getTime();
  });

  await writeDailyEntriesFile(entries);
  return processEntryFromFile(entryToSave);
}

export async function getAllEntriesFromFile(): Promise<DailyLogEntry[]> {
  const entries = await readDailyEntriesFile();
  return entries.map(processEntryFromFile);
}


// --- Settings File DB Functions ---

export async function readSettingsFile(): Promise<Settings> {
  await ensureDataDir();
  try {
    const fileContent = await fs.readFile(SETTINGS_FILE_PATH, 'utf-8');
    return JSON.parse(fileContent) as Settings;
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      await fs.writeFile(SETTINGS_FILE_PATH, JSON.stringify({}, null, 2));
      return {}; 
    }
    console.error('Error reading settings file:', error);
    throw new Error('Failed to read settings data.');
  }
}

export async function writeSettingsFile(settings: Settings): Promise<void> {
  await ensureDataDir();
  try {
    await fs.writeFile(SETTINGS_FILE_PATH, JSON.stringify(settings, null, 2));
  } catch (error) {
    console.error('Error writing settings file:', error);
    throw new Error('Failed to write settings data.');
  }
}

export async function getSettingFromFile<K extends keyof Settings>(configId: K): Promise<Settings[K] | null> {
  const settings = await readSettingsFile();
  return settings[configId] || null;
}

export async function saveSettingToFile<K extends keyof Settings>(configId: K, value: Settings[K]): Promise<void> {
  const settings = await readSettingsFile();
  settings[configId] = value;
  await writeSettingsFile(settings);
}


// --- Users File DB Functions ---

export async function getUsersFromFile(): Promise<User[]> {
  await ensureDataDir();
  try {
    const fileContent = await fs.readFile(USERS_FILE_PATH, 'utf-8');
    return JSON.parse(fileContent) as User[];
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      await fs.writeFile(USERS_FILE_PATH, JSON.stringify([], null, 2));
      return [];
    }
    console.error('Error reading users file:', error);
    throw new Error('Failed to read user data.');
  }
}

export async function saveUsersToFile(users: User[]): Promise<void> {
  await ensureDataDir();
  try {
    await fs.writeFile(USERS_FILE_PATH, JSON.stringify(users, null, 2));
  } catch (error) {
    console.error('Error writing users file:', error);
    throw new Error('Failed to write user data.');
  }
}
