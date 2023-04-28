import Foundation
import React

@objc(TensorFlowLiteTTSBridge)
class TensorFlowLiteTTSBridge: NSObject {
    @objc(generateSpeech:modelTTSPath:modelMGanPath:resolver:rejecter:)
    func generateSpeech(textBase64: String, modelTTSPath: String, modelMGanPath:String, resolver: RCTPromiseResolveBlock, rejecter: RCTPromiseRejectBlock) -> Void {
        let tfliteTTS = TensorFlowLiteTTS(modelTTSPath: modelTTSPath, modelMGanPath: modelMGanPath)
        if let wavData = tfliteTTS.generateSpeech(inputBase64: textBase64) {
            resolver(wavData)
        } else {
            rejecter("error", "Failed to generate speech", nil)
        }
    }
}

