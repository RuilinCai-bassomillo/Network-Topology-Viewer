import React, { useRef, useEffect, useState, useCallback } from 'react';
import Graph from "react-graph-vis";
import uuid from "react-uuid";
import Modal from 'react-modal';
import debounce from 'lodash.debounce';

export default function Network(graph, showApplicationLayer, showNetworkServiceLayer, startNodeId, stopNodeId) {
    const networkRef = useRef(null);
    const [selectedEdge, setSelectedEdge] = useState(null);
    const [modalIsOpen, setIsOpen] = useState(false);

    const options = {
        interaction: {
            selectable: true,
            hover: true
        },
        clickToUse: false,
        physics: {
            enabled: true,
        },
        edges: {
            arrows: {
                to: {
                    enabled: true,
                    scaleFactor: 0,
                    type: "image"
                },
                from: {
                    enabled: true,
                    scaleFactor: 0,
                    type: "image"
                }
            },
            color: "#000000"
        },
        layout: {
            hierarchical: {
                direction: "LR",
                sortMethod: 'directed'
            }
        },
        height: "800px",
        nodes: {
            size: 20
        }
    };

    const events = {
        select: function (event) {
            var { nodes, edges } = event;
        }
    };
    const handleDoubleClick = useCallback(
        debounce((event) => {
            const { edges } = event;
            if (edges.length > 0) {
                const edgeId = edges[0];
                const edge = graph.edges.find((e) => e.id === edgeId);
                setSelectedEdge(edge);
                setIsOpen(true);
            }
        }, 300),
        [graph.edges]
    );

    useEffect(() => {
        const network = networkRef.current;
        if (network) {
            network.on('doubleClick', handleDoubleClick);
        }
        return () => {
            if (network) {
                network.off('doubleClick', handleDoubleClick);
            }
        };
    }, [handleDoubleClick]);
    useEffect(() => {
        if (showApplicationLayer) {
            networkRef.current.setData({
                nodes: [...graph.nodes,
                { id: 10, label: "Node 10", title: "node 10 tootip text" }, { id: 11, label: "Node 11", title: "node 11 tootip text" }], edges: [...graph.edges,
                { from: 10, to: 1 }, { from: 11, to: 8 }, { from: 11, to: 10 }]
            })
            networkRef.current.redraw();
            networkRef.current.once('stabilized', () => {
                // Example: Get node position
                const position1 = networkRef.current.getPosition(1);
                const position7 = networkRef.current.getPosition(8);
                networkRef.current.moveNode(10, position1.x, position1.y - 300)
                networkRef.current.moveNode(11, position7.x, position1.y - 300)
            })
        } else if (showNetworkServiceLayer) {
            networkRef.current.setData({
                nodes: [...graph.nodes,
                { id: 10, label: "Node 10", title: "node 10 tootip text" }, { id: 11, label: "Node 11", title: "node 11 tootip text" }], edges: [...graph.edges,
                { from: 10, to: 2 }, { from: 11, to: 7 }, { from: 11, to: 10 }]
            })
            networkRef.current.redraw();
            networkRef.current.once('stabilized', () => {
                // Example: Get node position
                const position1 = networkRef.current.getPosition(2);
                const position7 = networkRef.current.getPosition(7);
                networkRef.current.moveNode(10, position1.x, position1.y - 300)
                networkRef.current.moveNode(11, position7.x, position1.y - 300)
            })
        }
    }, [graph])
    return (
        <div>
            <Graph
                key={uuid()}
                graph={graph}
                options={options}
                events={events}
                getNetwork={(network) => { networkRef.current = network }}

            />
            <Modal
                isOpen={modalIsOpen}
                onRequestClose={() => setIsOpen(false)}
                contentLabel="Edge Details"
            >
                <h2>Edge Details</h2>
                {selectedEdge && <pre>{JSON.stringify(selectedEdge, null, 2)}</pre>}
                <button onClick={() => setIsOpen(false)}>Close</button>
            </Modal>


        </div>
    );

}

