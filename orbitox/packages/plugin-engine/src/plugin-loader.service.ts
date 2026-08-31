import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PluginManifest, ORBITOX_PLUGIN_METADATA_KEY, HeadlessPlugin } from '@orbitox/sdk';
import { ManifestValidator } from './manifest.validator';
import { IntegrityVerifier } from './security/integrity-verifier';
import { PackageSignature } from './security/crypto-signer';

export interface LoadedPlugin {
  manifest: PluginManifest;
  moduleClass: any;
  signature?: PackageSignature;
  isVerified?: boolean;
}

export interface PluginRegistrationOptions {
  signature?: PackageSignature | string;
  publicKeyPem?: string;
  strictSignatureRequired?: boolean;
}

@Injectable()
export class PluginLoaderService {
  private readonly logger = new Logger(PluginLoaderService.name);
  private readonly loadedPlugins = new Map<string, LoadedPlugin>();

  constructor(private readonly validator: ManifestValidator) {}

  registerPluginModule(
    moduleOrConfig: any,
    options?: PluginRegistrationOptions
  ): PluginManifest {
    let manifest: PluginManifest;
    let moduleClass: any = moduleOrConfig;

    if (moduleOrConfig && moduleOrConfig.isOrbitoXPlugin) {
      // It's a declarative definePlugin config
      manifest = (moduleOrConfig as HeadlessPlugin).manifest;
      moduleClass = null; // No NestJS module for declarative plugins
    } else {
      // It's a traditional NestJS module
      manifest = Reflect.getMetadata(ORBITOX_PLUGIN_METADATA_KEY, moduleOrConfig);
      if (!manifest) {
        throw new Error(`Module ${moduleOrConfig.name || 'Unknown'} is missing @OrbitoXPlugin decorator metadata`);
      }
    }

    this.validator.validate(manifest);

    // Cryptographic signature check if options provided
    let isVerified = false;
    let signatureObj: PackageSignature | undefined;

    if (options?.signature && options?.publicKeyPem) {
      if (typeof options.signature === 'string') {
        const isValid = IntegrityVerifier.verifyPayloadSignature(
          manifest,
          options.signature,
          options.publicKeyPem
        );
        if (!isValid) {
          throw new UnauthorizedException(
            `Security Alert: Plugin ${manifest.id} failed cryptographic signature verification`
          );
        }
        isVerified = true;
      } else {
        const isValid = IntegrityVerifier.verifyPayloadSignature(
          {
            signerId: options.signature.signerId,
            manifestHash: options.signature.manifestHash,
            fileTreeHash: (options.signature as any).fileTreeHash,
            signedAt: options.signature.signedAt,
          },
          options.signature.signature,
          options.publicKeyPem
        );
        if (!isValid) {
          throw new UnauthorizedException(
            `Security Alert: Plugin ${manifest.id} package signature is forged or invalid`
          );
        }
        signatureObj = options.signature;
        isVerified = true;
      }
    } else if (options?.strictSignatureRequired) {
      throw new UnauthorizedException(
        `Security Alert: Plugin ${manifest.id} registration rejected — strict signature required but none was provided`
      );
    }

    this.loadedPlugins.set(manifest.id, {
      manifest,
      moduleClass,
      signature: signatureObj,
      isVerified,
    });

    this.logger.log(
      `Loaded plugin: ${manifest.name} (v${manifest.version})${isVerified ? ' 🛡️ [Cryptographically Verified]' : ''}`
    );
    return manifest;
  }

  getPlugin(pluginId: string): LoadedPlugin | undefined {
    return this.loadedPlugins.get(pluginId);
  }

  getAllPlugins(): LoadedPlugin[] {
    return Array.from(this.loadedPlugins.values());
  }
}

