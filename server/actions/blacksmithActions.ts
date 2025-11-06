import { randomUUID } from 'crypto';
import { User, ServerActionHandler, InventoryItem, ItemGrade, Action, ChatMessage } from '../../types.js';
import { broadcast } from '../server.js';
import db from '../db/index.js';
import { 
