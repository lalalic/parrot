import TensorFlowLite
import AVFoundation

class TensorFlowLiteTTS {
    private let interpreterTTS: Interpreter
    private let interpreterMGan: Interpreter
    
    init(modelTTSPath: String, modelMGanPath: String) {
        do{
            interpreterTTS = try Interpreter(modelPath: modelTTSPath)
            interpreterMGan = try Interpreter(modelPath: modelMGanPath)
            
            try interpreterTTS.allocateTensors()
            try interpreterMGan.allocateTensors()
            
            debugPrint("model path: \(modelTTSPath), \(modelMGanPath)")
        }catch{
            fatalError("init model error: \(error) for \(modelTTSPath) and \(modelMGanPath)")
        }
    }
    
    func printInputTensors(_ interpreter: Interpreter){
        for i in 0...interpreter.inputTensorCount-1{
            let tensor=try! interpreter.input(at: i)
            print(tensor)
        }
    }

    func printOutputTensors(_ interpreter: Interpreter){
        for i in 0...interpreter.outputTensorCount-1{
            let tensor=try! interpreter.output(at: i)
            print(tensor)
        }
    }
    
    func toData<T>(_ value: T)->Data{
        var data=Data()
        withUnsafeBytes(of: value){
            data.append(contentsOf: $0)
        }
        return data
    }
    
    func toData(_ inputBase64: String) -> Data{
        let raw = Data(base64Encoded: inputBase64)!
        var data=Data()
        raw.forEach{ byte in
            data.append(toData(Int32(byte)))
        }
        
        return data
    }
    
    func generateSpeech(inputBase64: String) -> String? {
        do{
            let data = toData(inputBase64)
            
            try interpreterTTS.resizeInput(at: 0, to: [1, data.count/4])
            try interpreterTTS.allocateTensors()
            
            try interpreterTTS.copy(toData(Int32(0)), toInputAt: 1)
            try interpreterTTS.copy(toData(Float32(1.0)), toInputAt: 2)
            try interpreterTTS.copy(toData(Float32(1.0)), toInputAt: 3)
            try interpreterTTS.copy(toData(Float32(1.0)), toInputAt: 4)
            
            
            //try interpreterTTS.copy(toData(Int32(data.count/4)), toInputAt: 1)
            //try interpreterTTS.copy(toData(Int32(0)), toInputAt: 2)
            
            
            try interpreterTTS.copy(data,toInputAt: 0)
            try interpreterTTS.invoke()
            
            let outputTensor = try interpreterTTS.output(at: 1)
            
            try interpreterMGan.resizeInput(at: 0, to: outputTensor.shape)
            try interpreterMGan.allocateTensors()
            try interpreterMGan.copy(outputTensor.data, toInputAt: 0)
            try interpreterMGan.invoke()
            
            return toAudioData(try interpreterMGan.output(at: 0))
        }catch{
            debugPrint("generate speech error: \(error)")
            return ""
        }
    }
    
    func toFloat32Array(_ data: Data) -> [Float32]{
        var floatOutputData=data.withUnsafeBytes { (ptr: UnsafeRawBufferPointer) -> [Float32] in
            let floatPtr = ptr.bindMemory(to: Float32.self)
            return Array(floatPtr)
        }
        return floatOutputData
    }
    
    func toAudioData(_ outputTensor: Tensor) -> String{
        do{
            let audioData = toFloat32Array(outputTensor.data)
            let audioFormat = AVAudioFormat(commonFormat: .pcmFormatFloat32, sampleRate: 22050, channels: 1, interleaved: true)!
            let audioBuffer = AVAudioPCMBuffer(pcmFormat: audioFormat, frameCapacity: AVAudioFrameCount(audioData.count))!
            audioBuffer.floatChannelData![0].assign(from: audioData, count: audioData.count)
            audioBuffer.frameLength = audioBuffer.frameCapacity
            
            let audioFileURL = URL(fileURLWithPath: NSTemporaryDirectory() + "audio.wav")
            let audioFile = try AVAudioFile(forWriting: audioFileURL, settings: audioFormat.settings)
            try audioFile.write(from: audioBuffer)

            return audioFileURL.absoluteString
        } catch {
            debugPrint("save audio error: \(error)")
            return ""
        }
    }
}
