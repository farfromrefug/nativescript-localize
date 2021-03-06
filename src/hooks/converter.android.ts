import * as fs from 'fs';
import * as path from 'path';

import { ConverterCommon } from './converter.common';
import { DataProvider, I18nEntries, Languages } from './data.provider';
import { encodeValue } from './resource.android';

export class ConverterAndroid extends ConverterCommon {
    public constructor(
        dataProvider: DataProvider,
        androidResourcesMigrationService: IAndroidResourcesMigrationService,
        logger: ILogger,
        platformData: IPlatformData,
        projectData: IProjectData
    ) {
        super(dataProvider, logger, platformData, projectData);
        if (androidResourcesMigrationService.hasMigrated(projectData.appResourcesDirectoryPath)) {
            this.appResourcesDirectoryPath = path.join(this.appResourcesDirectoryPath, 'src', 'main', 'res');
        }
    }

    protected cleanObsoleteResourcesFiles(resourcesDirectory: string, languages: Languages): this {
        fs.readdirSync(resourcesDirectory)
            .filter((fileName) => {
                const match = /^values-(.+)$/.exec(fileName);
                return match && !languages.has(match[1].replace(/^(.+?)-r(.+?)$/, '$1-$2'));
            })
            .map((fileName) => path.join(resourcesDirectory, fileName))
            .filter((filePath) => fs.statSync(filePath).isDirectory())
            .forEach((lngResourcesDir) => {
                const resourceFilePath = path.join(lngResourcesDir, 'strings.xml');
                this.removeFileIfExists(resourceFilePath);
                this.removeDirectoryIfEmpty(lngResourcesDir);
            });
        return this;
    }

    protected createLanguageResourcesFiles(language: string, isDefaultLanguage: boolean, i18nEntries: I18nEntries): this {
        const languageResourcesDir = path.join(
            this.appResourcesDirectoryPath,
            `values${isDefaultLanguage ? '' : `-${language.replace(/^(.+?)-(.+?)$/, '$1-r$2')}`}`
        );
        this.createDirectoryIfNeeded(languageResourcesDir);
        let strings = '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n';
        this.encodeI18nEntries(i18nEntries).forEach((encodedValue, encodedKey) => {
            strings += `  <string name="${encodedKey}">${encodedValue}</string>\n`;
        });
        strings += '</resources>\n';
        const resourceFilePath = path.join(languageResourcesDir, 'strings.xml');
        this.writeFileSyncIfNeeded(resourceFilePath, strings);
        return this;
    }

    private encodeI18nEntries(i18nEntries: I18nEntries): I18nEntries {
        const encodedI18nEntries: I18nEntries = new Map();
        i18nEntries.forEach((value, key) => {
            const encodedKey = key;
            const encodedValue = encodeValue(value);
            if (key.indexOf('ios.info.plist') !== -1) {
                /* do nothing */
            } else if (key === 'app.name') {
                encodedI18nEntries.set('app_name', encodedValue);
                encodedI18nEntries.set('title_activity_kimera', encodedValue);
            } else encodedI18nEntries.set(encodedKey, encodedValue);
        });
        return encodedI18nEntries;
    }
}
