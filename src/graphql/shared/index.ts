import { concatAST, parse } from 'graphql';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const sharedTypeDefsPath = path.resolve(process.cwd(), 'src/graphql/shared/common.graphql');
const sharedTypeDefsText = readFileSync(sharedTypeDefsPath, 'utf8');
const sharedTypeDefsDocument = parse(sharedTypeDefsText);

export const sharedTypeDefs = concatAST([sharedTypeDefsDocument]);
