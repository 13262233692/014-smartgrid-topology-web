import { ParsedCimData } from './cim.types';
export declare class CimParserService {
    private readonly RDF_PREFIX;
    private readonly ID_ATTR;
    private readonly ABOUT_ATTR;
    private readonly RESOURCE_ATTR;
    parseXmlBuffer(buffer: Buffer): ParsedCimData;
    parse(xmlContent: string): ParsedCimData;
    private extractTopology;
    private findElements;
    private parseElement;
    private buildConnections;
    generateDemoData(): ParsedCimData;
}
