import jsdom from "jsdom";
const { JSDOM } = jsdom;

const contentNodes = ['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6'];

export const convertHTMLToObj = (html: string) => {
    const paragraphs = [];

    let re = new RegExp(/<p>(.*?)<\/p>/, 'gm');

    let array1;

    while ((array1 = re.exec(html)) !== null) {
        paragraphs.push(array1[1]);
    }

    const dom = new JSDOM(`<!DOCTYPE html>`+html);
    const nodes = dom.window.document.querySelector('body')?.childNodes;
    const res: any = parseNodes(nodes, [], {});

    return res;
};

function parseNodes(nodes: NodeListOf<ChildNode>|undefined, res:any=[], styles:any={}) {
    if (!nodes) {
        return res;
    }

    for (let i=0; i < nodes.length; i++) {
        const node = nodes[i];

        if (contentNodes.includes(node.nodeName)) {
            res.push({
                type: node.nodeName,
                content: parseNodes(node.childNodes, [], styles)
            });
        } 
        else {
            if (!node.hasChildNodes()) {
                res.push({
                    type: node.nodeName,
                    value: node.nodeValue,
                    styles
                });
            } else {
                styles[node.nodeName] = true;
                parseNodes(node.childNodes, res, styles)
            }

            styles = {};
        }
    }

    return res;
}