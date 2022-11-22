import {AssetHashType, AssetOptions, NestedStack, NestedStackProps} from "aws-cdk-lib";
import {Code, LayerVersion, Runtime} from "aws-cdk-lib/aws-lambda";
import {Construct} from "constructs";
import * as path from "path";
import {environment} from "../../environment";
import * as fs from "fs";
import * as crypto from "crypto";


export class LambdaLayersNestedStack extends NestedStack {

    private _layers: LayerVersion[]

    constructor(scope: Construct, id: string, props: NestedStackProps) {
        super(scope, id, props);

        this.createLambdaLayers();
    }

    private createLambdaLayers() {
        this._layers = [];
        const rootPath = path.join(__dirname, "..", "..", "..");
        this.createDependenciesLayer(
            "PythonLayer",
            path.join(rootPath,'dist', "dependencies.zip"),
            `${environment.name}--${environment.project}-python-dependencies`,
            path.join(rootPath, "requirements.txt")
        )
    }

    private createDependenciesLayer(id: string, zipFilePath: string, layerName: string, fileToHash?: string) {
        let assetOptions: AssetOptions | undefined = undefined;
        if (fileToHash) {
            assetOptions = {
                assetHashType: AssetHashType.CUSTOM,
                assetHash: LambdaLayersNestedStack.getFileHash(fileToHash)
            };
        }
        const layer = new LayerVersion(this, id, {
            code: Code.fromAsset(zipFilePath, assetOptions),
            compatibleRuntimes: [Runtime.PYTHON_3_9],
            layerVersionName: layerName,
        });

        this.layers.push(layer);
    }

    private static getFileHash(path: string): string {
        const fileBuffer = fs.readFileSync(path);
        const hashSum = crypto.createHash('sha256');
        hashSum.update(fileBuffer);
        return hashSum.digest('hex')
    }



    get layers(): LayerVersion[] {
        return this._layers;
    }
}
