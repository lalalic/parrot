import { PureComponent } from 'react';

export class PersistentHistory extends PureComponent {
    componentWillUnmount() {
        const { onQuit, positionMillis } = this.props;
        onQuit?.({ time: positionMillis });
    }

    render() {
        return null;
    }
}
