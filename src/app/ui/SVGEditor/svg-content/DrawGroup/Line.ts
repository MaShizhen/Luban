import { createSVGElement } from '../../element-utils';
import { ThemeColor } from './constants';
import { Point } from './Point';

class Line {
    public points: Point[]

    public EndPoins: Point[]

    public EndPointsEle: SVGRectElement[] = []

    public ele: SVGPathElement

    constructor(ele) {
        this.ele = ele;

        const points = this.parsePoints();
        this.points = points;
        this.EndPoins = [
            this.points[0],
            this.points[this.points.length - 1]
        ];
        this.generateEndPointEle();
    }

    public updatePosition(points?: Point[]) {
        points && this.ele.setAttribute('d', points.length === 2 ? `M ${points[0].join(' ')} L ${points[1].join(' ')} Z` : `M ${points[0].join(' ')} Q ${points[1].join(' ')}, ${points[2].join(' ')}`);
        this.updateEndPointEle(points);
    }

    private parsePoints() {
        const d = this.ele.getAttribute('d');
        const res: string[] = d.match(/\d+\.*\d*/g);
        const points: Array<[number, number]> = [];
        if (res) {
            for (let index = 0; index < res.length; index += 2) {
                points.push([
                    Number(res[index]),
                    Number(res[index + 1])
                ]);
            }
        }
        return points;
    }

    private updateEndPointEle(point?: Point[]) {
        if (point) {
            const EndPoins = point ? [
                point[0],
                point[point.length - 1]
            ] : this.EndPoins;

            EndPoins.forEach((item, index) => {
                this.EndPointsEle[index].setAttribute('x', (item[0] - 2).toString());
                this.EndPointsEle[index].setAttribute('y', (item[1] - 2).toString());
            });
        } else {
            const points = this.parsePoints();
            this.points = points;
            this.EndPoins = [
                this.points[0],
                this.points[this.points.length - 1]
            ];
        }
    }

    public generateEndPointEle() {
        this.EndPoins.forEach((item) => {
            const circle = Array.from(document.querySelectorAll<SVGRectElement>('rect[type="end-point"]')).find(ele => {
                return ele.getAttribute('x') === (item[0] - 2).toString() && ele.getAttribute('y') === (item[1] - 2).toString();
            }) || createSVGElement({
                element: 'rect',
                attr: {
                    type: 'end-point',
                    fill: '',
                    'fill-opacity': 1,
                    rx: '2',
                    ry: '2',
                    width: 4,
                    height: 4,
                    x: item[0] - 2,
                    y: item[1] - 2,
                    stroke: ThemeColor,
                    'pointer-events': 'all'
                }
            });
            this.EndPointsEle.push(circle);
        });
    }

    public del() {
        this.ele.remove();
    }
}

export default Line;
