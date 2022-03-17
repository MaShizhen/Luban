import type ContentGroup from '../../ui/SVGEditor/svg-content/SVGContentGroup';
import Operation from './Operation';

type DrawStartProp = {
    elem: string;
    contentGroup: ContentGroup;
}

export default class DrawStart extends Operation<DrawStartProp> {
    constructor(props: DrawStartProp) {
        super();
        this.state = {
            elem: props.elem,
            contentGroup: props.contentGroup,
        };
    }

    public redo() {
        this.state.contentGroup.drawGroup.stopDraw(true);
        // this.state.contentGroup.onChangeMode('draw');
        this.state.contentGroup.drawGroup.startDraw(this.state.elem);
    }

    public undo() {
        this.state.contentGroup.drawGroup.stopDraw(true);
        this.state.contentGroup.onChangeMode('select');
    }
}
