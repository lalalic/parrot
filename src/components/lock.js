import { Mutex } from "async-mutex";

// Speak, PlaySound, Recognizer, and Video share mutex lock

export default new (class extends Mutex {
    runExclusive() {
        this.cancel();
        return super.runExclusive(...arguments);
    }
})();
