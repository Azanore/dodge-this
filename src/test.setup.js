// Test setup: provides gameConfig global and browser stubs for all test files.
import gameConfigModule from '../game.config.js';

// Expose as global so source modules that reference gameConfig directly can find it
globalThis.gameConfig = gameConfigModule;
