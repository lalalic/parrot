
#import "React/RCTBridgeModule.h"
#import "React/RCTEventEmitter.h"

@interface RCT_EXTERN_MODULE(TensorFlowLiteTTSBridge, RCTEventEmitter)

RCT_EXTERN_METHOD(generateSpeech:(NSString *)inputText
                  modelTTSPath: (NSString *)modelTTSPath  
                  modelMGanPath: (NSString *)modelMGanPath  
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
