// mark-deco - Flexible Markdown to HTML conversion library
// Copyright (c) Kouji Matsui. (@kekyo@mi.kekyo.net)
// Under MIT.
// https://github.com/kekyo/mark-deco

import { readFile, writeFile } from 'fs/promises';
import { stdin } from 'process';

/**
 * Read input from file or stdin
 */
export async function readInput(inputPath?: string): Promise<string> {
  if (inputPath) {
    // Read from file
    try {
      return await readFile(inputPath, 'utf-8');
    } catch (error) {
      throw new Error(
        `Failed to read input file "${inputPath}": ${error instanceof Error ? error.message : String(error)}`
      );
    }
  } else {
    // Read from stdin
    return new Promise((resolve, reject) => {
      let data = '';

      // Check if stdin is a TTY (interactive mode)
      if (stdin.isTTY) {
        reject(
          new Error(
            'No input file specified and stdin is not available. Use -i option to specify input file.'
          )
        );
        return;
      }

      stdin.setEncoding('utf-8');

      stdin.on('data', (chunk) => {
        data += chunk;
      });

      stdin.on('end', () => {
        resolve(data);
      });

      stdin.on('error', (error) => {
        reject(new Error(`Failed to read from stdin: ${error.message}`));
      });
    });
  }
}

/**
 * Write output to file or stdout
 */
export async function writeOutput(
  html: string,
  outputPath?: string
): Promise<void> {
  if (outputPath) {
    // Write to file
    try {
      await writeFile(outputPath, html, 'utf-8');
    } catch (error) {
      throw new Error(
        `Failed to write output file "${outputPath}": ${error instanceof Error ? error.message : String(error)}`
      );
    }
  } else {
    // Write to stdout
    try {
      process.stdout.write(html);
    } catch (error) {
      throw new Error(
        `Failed to write to stdout: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}

/**
 * Write JSON output to file
 */
export async function writeJsonOutput(
  data: unknown,
  outputPath: string
): Promise<void> {
  try {
    const jsonContent = JSON.stringify(data, null, 2);
    await writeFile(outputPath, jsonContent, 'utf-8');
  } catch (error) {
    throw new Error(
      `Failed to write JSON output file "${outputPath}": ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
