import React, { useRef, useEffect, useState, useCallback } from 'react';
import Dashboard from '../Components/Dashboard.js'
import Graph from "react-graph-vis";
import uuid from "react-uuid";
import 'react-json-pretty/themes/monikai.css';
import JsonWindow from '../Components/JsonWindow.js';
import * as d3 from "d3";
import UploadFileDialog from '../Components/UploadFileDialog.js';
import { useSelector } from 'react-redux';
import Button from '@mui/material/Button';
import theme from './Theme.js';
import { ThemeProvider } from '@emotion/react';
export default function NetworkHomepage() {
    const networkRef = useRef(null);
    const tooltipRef = useRef(null);
    const [graph, setGraph] = useState({ nodes: [], edges: [] });
    const [underlayPathMap, setUnderlayPathMap] = useState({})
    const [underlayBackupPathMap, setUnderlayBackupPathMap] = useState({})
    const [linklabelName, setLinkLabelName] = useState([])
    const [nodelabelName, setNodeLabelName] = useState([])
    const [OTNLabelTooltip, setOTNLabelTooltip] = useState({})
    const [WDMLabelTooltip, setWDMLabelTooltip] = useState({})
    const [selectedEdge, setSelectedEdge] = useState(null);
    const [modalIsOpen, setIsOpen] = useState(false);
    const [modalTitle, setModelTitle] = useState("")
    const [nodesGlobal, setNodesGlobal] = useState([])
    const [nodeWithLinkedNodesMapGlobal, setNodeWithLinkedNodesMapGlobal] = useState([])
    const [linkWithDualAndUniGlobal, setLinkWithDualAndUniGlobal] = useState([])
    const [nodeWithLinkedNodesMapGlobalOtn, setNodeWithLinkedNodesMapGlobalOtn] = useState([])
    const [linkWithDualAndUniGlobalOtn, setLinkWithDualAndUniGlobalOtn] = useState([])
    const [nodeWithLinkedNodesMapGlobalL3, setNodeWithLinkedNodesMapGlobalL3] = useState([])
    const [linkWithDualAndUniGlobalL3, setLinkWithDualAndUniGlobalL3] = useState([])
    const [uploadFileDiagramOpen, setUploadFileDiagramOpen] = useState(false)
    const { data, fileName } = useSelector((state) => state.jsonData);
    const [updateState, setUpdateState] = useState(false)

    function checkNetworkType(network) {
        // Check if the key 'network-types' exists and if it contains 'ietf-te-topology:te-topology'
        if (network["network-types"] && network["network-types"]["ietf-te-topology:te-topology"]) {
            const teTopology = network["network-types"]["ietf-te-topology:te-topology"];

            // Check for 'ietf-otn-topology:otn-topology'
            if ("ietf-otn-topology:otn-topology" in teTopology) {
                return "OTN";
            }
            // Check for 'ietf-otn-topology:eth-topology'
            if ("ietf-wson-topology:wson-topology" in teTopology) {
                return "WDM";
            }
        }
        if (network["network-types"]) {
            if ("ietf-l3-isis-topology:isis-topology" in network["network-types"]) {
                return "l3"
            }

        }

        return "Unknown";
    }

    function findDualLinks(links) {
        const dualLinks = [];

        // Loop through all links
        for (let i = 0; i < links.length; i++) {
            const linkA = links[i];

            for (let j = i; j < links.length; j++) {
                if (i !== j) {
                    const linkB = links[j];

                    // Check if source of A matches destination of B and vice versa
                    if (
                        linkA["source"]["source-node"] === linkB["destination"]["dest-node"] &&
                        linkA["destination"]["dest-node"] === linkB["source"]["source-node"] &&
                        linkA["source"]["source-tp"] === linkB["destination"]["dest-tp"] &&
                        linkA["destination"]["dest-tp"] === linkB["source"]["source-tp"]
                    ) {
                        // Store the dual connection pair
                        dualLinks.push({ linkA: linkA["link-id"], linkB: linkB["link-id"] });
                    }
                }
            }
        }

        // Remove duplicates by keeping only one pair of links
        const uniqueDualLinks = [];

        dualLinks.forEach(linkPair => {
            // Check if we already added this reverse pair
            const exists = uniqueDualLinks.some(pair =>
                (pair.linkA === linkPair.linkB && pair.linkB === linkPair.linkA)
            );
            if (!exists) {
                uniqueDualLinks.push(linkPair);
            }
        });

        return uniqueDualLinks;
    }

    function getUniDirectionalLinks(links, dualLinks) {
        const dualLinkIds = [];

        // Collect all link-ids involved in dual connections
        dualLinks.forEach(pair => {
            dualLinkIds.push(pair.linkA, pair.linkB);
        });

        // Filter out the dual links from the original list
        return links.filter(link => !dualLinkIds.includes(link["link-id"]));
    }

    // Function to transform the JSON
    function getConnectionInfoOfNodes(links) {
        const connections = new Set(); // Use a Set to avoid duplicates

        // Loop through the links
        links.forEach((link) => {
            const sourceNode = link["source"]["source-node"];
            const destNode = link["destination"]["dest-node"];

            // Normalize the connection by sorting the nodes alphabetically
            const normalizedConnection =
                sourceNode < destNode
                    ? JSON.stringify({ source: sourceNode, dest: destNode })
                    : JSON.stringify({ source: destNode, dest: sourceNode });

            // Add the normalized connection to the Set
            connections.add(normalizedConnection);
        });

        // Convert the Set back to an array of objects
        const connectionsArray = Array.from(connections).map((conn) => JSON.parse(conn));

        // Return the simplified JSON
        return connectionsArray;
    }

    // Function to transform the JSON
    function getConnectionInfoOfNodesD3(links) {
        const connections = new Set(); // Use a Set to avoid duplicates

        // Loop through the links
        links.forEach((link) => {
            const sourceNode = link["source"]["source-node"];
            const destNode = link["destination"]["dest-node"];

            // Normalize the connection by sorting the nodes alphabetically
            const normalizedConnection =
                sourceNode < destNode
                    ? JSON.stringify({ source: sourceNode, target: destNode })
                    : JSON.stringify({ source: destNode, target: sourceNode });

            // Add the normalized connection to the Set
            connections.add(normalizedConnection);
        });

        // Convert the Set back to an array of objects
        const connectionsArray = Array.from(connections).map((conn) => JSON.parse(conn));

        // Return the simplified JSON
        return connectionsArray;
    }

    function createNodeMap(nodeList, linkList) {
        // Initialize an empty map
        const nodeMap = {};

        // Initialize the map with empty arrays for each node
        nodeList.forEach(node => {
            nodeMap[node.id] = [];
        });

        // Populate the map based on the link list
        linkList.forEach(link => {
            //   const [node1, node2] = link;
            const node1 = link.source
            const node2 = link.dest


            // Add node2 to node1's connections
            if (!nodeMap[node1].includes(node2)) {
                nodeMap[node1].push(node2);
            }

            // Add node1 to node2's connections (since it's an undirected graph)
            if (!nodeMap[node2].includes(node1)) {
                nodeMap[node2].push(node1);
            }
        });

        return nodeMap;
    }

    function transformDualLinksToUniDirectional(dualLinks) {
        const uniDirectionalLinks = [];

        for (const dualLink of dualLinks) {
            const [sourceNode, sourceTp] = dualLink.linkA.split('-');
            const [destNode, destTp] = dualLink.linkB.split('-');

            // Create a uni-directional link using linkA as the source
            uniDirectionalLinks.push({
                "source": { "source-node": sourceNode, "source-tp": sourceTp },
                "destination": { "dest-node": destNode, "dest-tp": destTp },
                "link-id": dualLink.linkA
            });
        }

        return uniDirectionalLinks;
    }
    function categorizeNodesByDirectionClockwise(connectedNodesMap, nodeCoordinates) {
        const result = {};

        for (const [nodeId, connectedNodes] of Object.entries(connectedNodesMap)) {
            const sourceNode = nodeCoordinates.find(node => node.id === nodeId);
            if (!sourceNode) continue;

            const directionMap = { up: [], right: [], down: [], left: [] };

            // Categorize nodes into directions
            for (const connectedNodeId of connectedNodes) {
                const targetNode = nodeCoordinates.find(node => node.id === connectedNodeId);
                if (!targetNode) continue;

                const dx = targetNode.x - sourceNode.x;
                const dy = targetNode.y - sourceNode.y;
                if (Math.abs(dx) > Math.abs(dy)) {
                    // Horizontal direction dominates
                    if (dx > 0) {
                        directionMap.right.push({ id: connectedNodeId, y: targetNode.y });
                    } else {
                        directionMap.left.push({ id: connectedNodeId, y: targetNode.y });
                    }
                } else {
                    // Vertical direction dominates
                    if (dy > 0) {
                        directionMap.up.push({ id: connectedNodeId, x: targetNode.x });
                    } else {
                        directionMap.down.push({ id: connectedNodeId, x: targetNode.x })
                    }
                }
            }

            // Sort nodes within each direction
            directionMap.up.sort((a, b) => a.x - b.x); // Sort by x (ascending)
            directionMap.right.sort((a, b) => b.y - a.y); // Sort by y (ascending)
            directionMap.down.sort((a, b) => b.x - a.x); // Sort by x (descending)
            directionMap.left.sort((a, b) => a.y - b.y); // Sort by y (descending)

            // Extract node IDs in clockwise order: up -> right -> down -> left
            const sortedDirectionMap = {
                up: directionMap.up.map(node => node.id),
                right: directionMap.right.map(node => node.id),
                down: directionMap.down.map(node => node.id),
                left: directionMap.left.map(node => node.id)
            };

            result[nodeId] = sortedDirectionMap;
        }

        return result;
    }

    function generateTpsOfNodesDirectional(listA, listB, nodesWithTpsMap) {
        const result = {};

        // Define the order of directions for overflow
        const directionOrder = ['up', 'right', 'down', 'left'];

        // Iterate through listA
        for (const [sourceNode, directions] of Object.entries(listA)) {
            const nodeResult = { up: [], right: [], down: [], left: [] };

            // Iterate through each direction
            for (const [direction, destNodes] of Object.entries(directions)) {
                if (direction === "up" || direction === "right") {
                    for (const destNode of destNodes) {
                        for (const link of listB) {
                            if (
                                (link.source['source-node'] === sourceNode && link.destination['dest-node'] === destNode) ||
                                (link.source['source-node'] === destNode && link.destination['dest-node'] === sourceNode)
                            ) {
                                // Extract the tpId of the source node
                                const tpId = link.source['source-node'] === sourceNode
                                    ? link.source['source-tp']
                                    : link.destination['dest-tp'];

                                // Add the tpId to the current direction
                                nodeResult[direction].push(tpId);
                            }
                        }
                    }

                } else {
                    for (const destNode of destNodes) {
                        for (const link of listB.slice().reverse()) {
                            if (
                                (link.source['source-node'] === sourceNode && link.destination['dest-node'] === destNode) ||
                                (link.source['source-node'] === destNode && link.destination['dest-node'] === sourceNode)
                            ) {
                                // Extract the tpId of the source node
                                const tpId = link.source['source-node'] === sourceNode
                                    ? link.source['source-tp']
                                    : link.destination['dest-tp'];

                                // Add the tpId to the current direction
                                nodeResult[direction].push(tpId);
                            }

                        }
                    }

                }
            }

            // Handle overflow: if a direction has more than 4 tpIds, move the excess to the next direction
            for (let i = 0; i < directionOrder.length; i++) {
                const currentDirection = directionOrder[i];
                const nextDirection = directionOrder[(i + 1) % directionOrder.length]; // Wrap around using modulo

                while (nodeResult[currentDirection].length > 4) {
                    const excessTpId = nodeResult[currentDirection].pop(); // Remove the last tpId
                    nodeResult[nextDirection].unshift(excessTpId); // Add it to the beginning of the next direction
                }
            }
            // Add missing TPs in clockwise order
            if (nodesWithTpsMap[sourceNode]) {
                const allTpsInMap = nodesWithTpsMap[sourceNode];
                const existingTps = Object.values(nodeResult).flat();
                const missingTps = allTpsInMap.filter(tp => !existingTps.includes(tp));

                for (const tpId of missingTps) {
                    let placed = false;
                    for (const dir of directionOrder) {
                        if (nodeResult[dir].length < 4) {
                            nodeResult[dir].push(tpId);
                            placed = true;
                            break;
                        }
                    }
                    if (!placed) {
                        // If all directions are full, force-add to a random direction
                        const randomDir = directionOrder[
                            Math.floor(Math.random() * directionOrder.length)
                        ];
                        nodeResult[randomDir].push(tpId);
                    }
                }
            }

            // Add the processed node to the result
            result[sourceNode] = nodeResult;
        }

        return result;
    }

    function findTpIdDirectionAndIndex(data, nodeId, tpId) {
        // Check if the nodeId exists in the data
        if (!data[nodeId]) {
            return { error: `Node ID ${nodeId} not found in the data.` };
        }

        // Get the directions for the specified node
        const directions = data[nodeId];

        // Loop through each direction
        for (const [direction, tpIds] of Object.entries(directions)) {
            // Check if the tpId exists in the current direction
            const index = tpIds.indexOf(tpId);
            if (index !== -1) {
                return { direction, index };
            }
        }

        // If the tpId is not found in any direction
        return { error: `TP ID ${tpId} not found in node ${nodeId}.` };
    }

    useEffect(() => {
        const network = networkRef.current;

        if (network) {
            network.on("dragging", (params) => {

                if (params.nodes && params.nodes.length > 0) {
                    const ratio = 2
                    const allNodePositions = network.getPositions();

                    // Log all nodes and their coordinates
                    // console.log("All node positions:", allNodePositions);
                    const finalNodePositions = Object.entries(allNodePositions)
                        .filter(([nodeId]) => {
                            // Include nodes that start with "WDM" followed by an IP address
                            // Exclude nodes with "-$tpId" or "Label" in their IDs
                            return (
                                nodeId.startsWith("WDM") && // Starts with "WDM"
                                /^WDM\d+\.\d+\.\d+\.\d+$/.test(nodeId) && // Matches IP address format
                                !nodeId.includes("-") && // Excludes nodes with "-$tpId"
                                !nodeId.includes("Label") // Excludes nodes with "Label"
                            );
                        })
                        .map(([nodeId, { x, y }], index) => ({
                            id: nodeId.replace("WDM", ""), // Remove "WDM" prefix
                            index, // Add index
                            x: x, // Use the x coordinate
                            y: y, // Use the y coordinate
                            vy: 0, // Add default or calculated properties
                            // Add other properties as needed
                        }));
                    const finalNodePositionsOtn = Object.entries(allNodePositions)
                        .filter(([nodeId]) => {
                            return (
                                nodeId.startsWith("OTN") && // Starts with "OTN"
                                /^OTN\d+\.\d+\.\d+\.\d+$/.test(nodeId) && // Matches IP address format
                                !nodeId.includes("-") && // Excludes nodes with "-$tpId"
                                !nodeId.includes("Label") // Excludes nodes with "Label"
                            );
                        })
                        .map(([nodeId, { x, y }], index) => ({
                            id: nodeId.replace("OTN", ""), // Remove "OTN" prefix
                            index, // Add index
                            x: x, // Use the x coordinate
                            y: y, // Use the y coordinate
                            vy: 0, // Add default or calculated properties
                            // Add other properties as needed
                        }));

                    const finalNodePositionsL3 = Object.entries(allNodePositions)
                        .filter(([nodeId]) => {
                            return (
                                nodeId.startsWith("L3") && // Starts with "OTN"
                                /^L3\d+\.\d+\.\d+\.\d+$/.test(nodeId) && // Matches IP address format
                                !nodeId.includes("-") && // Excludes nodes with "-$tpId"
                                !nodeId.includes("Label") // Excludes nodes with "Label"
                            );
                        })
                        .map(([nodeId, { x, y }], index) => ({
                            id: nodeId.replace("L3", ""), // Remove "OTN" prefix
                            index, // Add index
                            x: x, // Use the x coordinate
                            y: y, // Use the y coordinate
                            vy: 0, // Add default or calculated properties
                            // Add other properties as needed
                        }));
                    const finalPositionsAll = Object.entries(allNodePositions)
                    const nodeToTpsMapWDM = finalPositionsAll.reduce((map, [id, _]) => {
                        if (!id.includes('-')) return map;
                        if (id.includes("WDM")) {
                            const firstHyphen = id.indexOf('-');

                            const nodeId = id.substring(2, firstHyphen); // "5.5.5.1"
                            const tpId = id.substring(firstHyphen + 1); // "eth-1/0/19.55"

                            // Initialize the node's TP array if it doesn't exist
                            if (!map[nodeId]) map[nodeId] = [];

                            // Add the TP ID to the node's list
                            map[nodeId].push(tpId);
                        }

                        return map;
                    }, {});
                    const nodeToTpsMapOTN = finalPositionsAll.reduce((map, [id, _]) => {
                        if (!id.includes('-')) return map;
                        if (id.includes("OTN")) {
                            const firstHyphen = id.indexOf('-');

                            const nodeId = id.substring(2, firstHyphen); // "5.5.5.1"
                            const tpId = id.substring(firstHyphen + 1); // "eth-1/0/19.55"

                            // Initialize the node's TP array if it doesn't exist
                            if (!map[nodeId]) map[nodeId] = [];

                            // Add the TP ID to the node's list
                            map[nodeId].push(tpId);
                        }

                        return map;
                    }, {});

                    const nodesInDirectionMap = categorizeNodesByDirectionClockwise(nodeWithLinkedNodesMapGlobal, finalNodePositions)
                    const tpsOfNodesDirectional = generateTpsOfNodesDirectional(nodesInDirectionMap, linkWithDualAndUniGlobal, nodeToTpsMapWDM)

                    const nodesInDirectionMapOtn = categorizeNodesByDirectionClockwise(nodeWithLinkedNodesMapGlobalOtn, finalNodePositionsOtn)
                    const tpsOfNodesDirectionalOtn = generateTpsOfNodesDirectional(nodesInDirectionMapOtn, linkWithDualAndUniGlobalOtn, nodeToTpsMapOTN)

                    const nodeToTpsMapL3 = finalPositionsAll.reduce((map, [id, _]) => {
                        if (!id.includes('-')) return map;
                        const firstHyphen = id.indexOf('-');

                        const nodeId = id.substring(2, firstHyphen); // "5.5.5.1"
                        const tpId = id.substring(firstHyphen + 1); // "eth-1/0/19.55"

                        // Initialize the node's TP array if it doesn't exist
                        if (!map[nodeId]) map[nodeId] = [];

                        // Add the TP ID to the node's list
                        map[nodeId].push(tpId);
                        return map;
                    }, {});


                    const nodesInDirectionMapL3 = categorizeNodesByDirectionClockwise(nodeWithLinkedNodesMapGlobalL3, finalNodePositionsL3)
                    const tpsOfNodesDirectionalL3 = generateTpsOfNodesDirectional(nodesInDirectionMapL3, linkWithDualAndUniGlobalL3, nodeToTpsMapL3)
                    // Now you can manually draw the nodes and links using the final coordinates
                    // drawNodesAndLinks(Nodes, nodesConnectRelationD3);
                    console.log("tpsOfNodesDirectionalL3", tpsOfNodesDirectionalL3)
                    graph.nodes.map(element => {

                        if (element.id.includes('-') && element.id.includes('WDM')) {
                            const [nodeId, tpId] = element.id.split('-');
                            const node = finalNodePositions.find((n) => "WDM" + n.id === nodeId);
                            const NodeIp = node.id
                            const result = findTpIdDirectionAndIndex(tpsOfNodesDirectional, NodeIp, tpId)
                            const direction = result.direction
                            const index = result.index

                            if (direction === "up") {
                                const length = tpsOfNodesDirectional[NodeIp]["up"].length
                                const preLength = tpsOfNodesDirectional[NodeIp]["left"].length
                                if (length === 4) {
                                    network.moveNode(element.id, node.x + (index * 20 - 30), node.y + 50)

                                } else if (length === 3) {
                                    network.moveNode(element.id, node.x + (80 / (length + 1) * (index + 1) - 40), node.y + 50)
                                } else {
                                    network.moveNode(element.id, node.x + (60 / (length + 1) * (index + 1) - 30), node.y + 50)
                                }
                            }
                            if (direction === "right") {
                                const length = tpsOfNodesDirectional[NodeIp]["right"].length
                                const preLength = tpsOfNodesDirectional[NodeIp]["up"].length
                                if (length === 4) {
                                    network.moveNode(element.id, node.x + 50, node.y - (index * 20 - 30))

                                } else if (length === 3) {
                                    network.moveNode(element.id, node.x + 50, node.y - (80 / (length + 1) * (index + 1) - 40))
                                } else {
                                    network.moveNode(element.id, node.x + 50, node.y - (60 / (length + 1) * (index + 1) - 30))
                                }

                            }
                            if (direction === "down") {
                                const length = tpsOfNodesDirectional[NodeIp]["down"].length
                                const preLength = tpsOfNodesDirectional[NodeIp]["right"].length
                                if (length === 4) {
                                    network.moveNode(element.id, node.x - (index * 20 - 30), node.y - 50)

                                } else if (length === 3) {
                                    network.moveNode(element.id, node.x - (80 / (length + 1) * (index + 1) - 40), node.y - 50)
                                } else {
                                    network.moveNode(element.id, node.x - (60 / (length + 1) * (index + 1) - 30), node.y - 50)
                                }

                            }
                            if (direction === "left") {
                                const length = tpsOfNodesDirectional[NodeIp]["left"].length
                                const preLength = tpsOfNodesDirectional[NodeIp]["down"].length
                                if (length === 4) {
                                    network.moveNode(element.id, node.x - 50, node.y + (index * 20 - 30))

                                } else if (length === 3) {
                                    network.moveNode(element.id, node.x - 50, node.y + (80 / (length + 1) * (index + 1) - 40))
                                } else {
                                    network.moveNode(element.id, node.x - 50, node.y + (60 / (length + 1) * (index + 1) - 30))
                                }

                            }
                        }

                        if (element.id.includes('-') && element.id.includes('OTN')) {
                            const [nodeId, tpId] = element.id.split('-');
                            const node = finalNodePositionsOtn.find((n) => "OTN" + n.id === nodeId);
                            const NodeIp = node.id
                            const result = findTpIdDirectionAndIndex(tpsOfNodesDirectionalOtn, NodeIp, tpId)
                            const direction = result.direction
                            const index = result.index
                            const yCentra = -120
                            if (direction === "up") {
                                const length = tpsOfNodesDirectionalOtn[NodeIp]["up"].length
                                const preLength = tpsOfNodesDirectionalOtn[NodeIp]["left"].length
                                if (length === 4) {
                                    network.moveNode(element.id, node.x + (index * 20 - 30), yCentra + (node.y - yCentra) + 50)
                                } else if (length === 3) {
                                    network.moveNode(element.id, node.x + (80 / (length + 1) * (index + 1) - 40), yCentra + (node.y - yCentra) + 50)
                                } else {
                                    network.moveNode(element.id, node.x + (60 / (length + 1) * (index + 1) - 30), yCentra + (node.y - yCentra) + 50)
                                }
                            }
                            if (direction === "right") {
                                const length = tpsOfNodesDirectionalOtn[NodeIp]["right"].length
                                const preLength = tpsOfNodesDirectionalOtn[NodeIp]["up"].length
                                if (length === 4) {
                                    network.moveNode(element.id, node.x + 50, yCentra + (node.y - yCentra) - (index * 20 - 30))
                                } else if (length === 3) {
                                    network.moveNode(element.id, node.x + 50, yCentra + (node.y - yCentra) - (80 / (length + 1) * (index + 1) - 40))
                                } else {
                                    network.moveNode(element.id, node.x + 50, yCentra + (node.y - yCentra) - (60 / (length + 1) * (index + 1) - 30))
                                }

                            }
                            if (direction === "down") {
                                const length = tpsOfNodesDirectionalOtn[NodeIp]["down"].length
                                const preLength = tpsOfNodesDirectionalOtn[NodeIp]["right"].length
                                if (length === 4) {
                                    network.moveNode(element.id, node.x - (index * 20 - 30), yCentra + (node.y - yCentra) - 50)
                                } else if (length === 3) {
                                    network.moveNode(element.id, node.x - (80 / (length + 1) * (index + 1) - 40), yCentra + (node.y - yCentra) - 50)
                                } else {
                                    network.moveNode(element.id, node.x - (60 / (length + 1) * (index + 1) - 30), yCentra + (node.y - yCentra) - 50)
                                }

                            }
                            if (direction === "left") {
                                const length = tpsOfNodesDirectionalOtn[NodeIp]["left"].length
                                const preLength = tpsOfNodesDirectionalOtn[NodeIp]["down"].length
                                if (length === 4) {
                                    network.moveNode(element.id, node.x - 50, yCentra + (node.y - yCentra) + (index * 20 - 30))

                                } else if (length === 3) {
                                    network.moveNode(element.id, node.x - 50, yCentra + (node.y - yCentra) + (80 / (length + 1) * (index + 1) - 40))
                                } else {
                                    network.moveNode(element.id, node.x - 50, yCentra + (node.y - yCentra) + (60 / (length + 1) * (index + 1) - 30))
                                }

                            }
                        }

                        if (element.id.includes('-') && element.id.includes('L3')) {
                            const firstHyphen = element.id.indexOf('-');

                            const nodeId = element.id.substring(0, firstHyphen); // "L35.5.5.1"
                            const tpId = element.id.substring(firstHyphen + 1); // "eth-1/0/19.55"
                            const node = finalNodePositionsL3.find((n) => "L3" + n.id === nodeId);
                            const NodeIp = node.id
                            const result = findTpIdDirectionAndIndex(tpsOfNodesDirectionalL3, NodeIp, tpId)
                            const direction = result.direction
                            const index = result.index
                            const yCentra = 0
                            if (direction === "up") {
                                const length = tpsOfNodesDirectionalL3[NodeIp]["up"].length
                                const preLength = tpsOfNodesDirectionalL3[NodeIp]["left"].length
                                if (length === 4) {
                                    network.moveNode(element.id, node.x + (index * 20 - 30), yCentra + (node.y - yCentra) + 50)
                                } else if (length === 3) {
                                    network.moveNode(element.id, node.x + (80 / (length + 1) * (index + 1) - 40), yCentra + (node.y - yCentra) + 50)
                                } else {
                                    network.moveNode(element.id, node.x + (60 / (length + 1) * (index + 1) - 30), yCentra + (node.y - yCentra) + 50)
                                }
                            }
                            if (direction === "right") {
                                const length = tpsOfNodesDirectionalL3[NodeIp]["right"].length
                                const preLength = tpsOfNodesDirectionalL3[NodeIp]["up"].length
                                if (length === 4) {
                                    network.moveNode(element.id, node.x + 50, yCentra + (node.y - yCentra) - (index * 20 - 30))
                                } else if (length === 3) {
                                    network.moveNode(element.id, node.x + 50, yCentra + (node.y - yCentra) - (80 / (length + 1) * (index + 1) - 40))
                                } else {
                                    network.moveNode(element.id, node.x + 50, yCentra + (node.y - yCentra) - (60 / (length + 1) * (index + 1) - 30))
                                }

                            }
                            if (direction === "down") {
                                const length = tpsOfNodesDirectionalL3[NodeIp]["down"].length
                                const preLength = tpsOfNodesDirectionalL3[NodeIp]["right"].length
                                if (length === 4) {
                                    network.moveNode(element.id, node.x - (index * 20 - 30), yCentra + (node.y - yCentra) - 50)
                                } else if (length === 3) {
                                    network.moveNode(element.id, node.x - (80 / (length + 1) * (index + 1) - 40), yCentra + (node.y - yCentra) - 50)
                                } else {
                                    network.moveNode(element.id, node.x - (60 / (length + 1) * (index + 1) - 30), yCentra + (node.y - yCentra) - 50)
                                }

                            }
                            if (direction === "left") {
                                const length = tpsOfNodesDirectionalL3[NodeIp]["left"].length
                                const preLength = tpsOfNodesDirectionalL3[NodeIp]["down"].length
                                if (length === 4) {
                                    network.moveNode(element.id, node.x - 50, yCentra + (node.y - yCentra) + (index * 20 - 30))

                                } else if (length === 3) {
                                    network.moveNode(element.id, node.x - 50, yCentra + (node.y - yCentra) + (80 / (length + 1) * (index + 1) - 40))
                                } else {
                                    network.moveNode(element.id, node.x - 50, yCentra + (node.y - yCentra) + (60 / (length + 1) * (index + 1) - 30))
                                }

                            }
                        }

                    })

                }
            });
            network.on("dragEnd", (params) => {

            });
            network.on('doubleClick',
                (event) => {
                    const tooltip = tooltipRef.current;
                    if (tooltip) {
                        tooltip.style.display = 'none';
                    }
                    console.log(event)
                    const networks = data["ietf-network:networks"]["network"]
                    if (event.nodes.length > 0) {
                        const nodeId = event.nodes[0]
                        if (!nodeId.includes("-")) {
                            console.log("nodeId", nodeId)
                            let nodeIdForGet = ""
                            if (nodeId.includes("L3")) {
                                nodeIdForGet = nodeId.substr(2)
                            } else {
                                nodeIdForGet = nodeId.substr(3)
                            }

                            if (nodeId.includes("OTN")) {
                                networks.map((item) => {
                                    if (checkNetworkType(item) === "OTN") {
                                        setModelTitle("IETF Network Node Model Instance")
                                        setSelectedEdge(item["node"].find(node => node['node-id'] === nodeIdForGet));
                                        setIsOpen(true);
                                    }
                                }

                                )
                            }





                            if (nodeId.includes("WDM")) {
                                networks.map((item) => {
                                    if (checkNetworkType(item) === "WDM") {
                                        setModelTitle("IETF Network Node Model Instance")
                                        setSelectedEdge(item["node"].find(node => node['node-id'] === nodeIdForGet));
                                        setIsOpen(true);
                                    }
                                }

                                )
                            }
                            if (nodeId.includes("L3")) {
                                networks.map((item) => {
                                    if (checkNetworkType(item) === "l3") {
                                        setModelTitle("Network Node Model Instance")
                                        setSelectedEdge(item["node"].find(node => node['node-id'] === nodeIdForGet));
                                        setIsOpen(true);
                                    }
                                }

                                )
                            }

                        }
                    }
                    if (event.edges.length > 0) {
                        const edgeId = event.edges[0];
                        console.log("edgeId:", edgeId)
                        let networkId = ""
                        const list = edgeId.split(" ");
                        const sourceBundle = list[1]
                        const destBundle = list[3]
                        const firstHyphenSource = sourceBundle.indexOf('-');

                        const nodeIdSource = sourceBundle.substring(0, firstHyphenSource); // eg: "L35.5.5.1"
                        const tpIdSource = sourceBundle.substring(firstHyphenSource + 1); // eg: "eth-1/0/19.55"
                        const firstHyphenDest = destBundle.indexOf('-');

                        const nodeIdDest = destBundle.substring(0, firstHyphenDest); //eg: "L35.5.5.1"
                        const tpIdDest = destBundle.substring(firstHyphenDest + 1); // eg:"eth-1/0/19.55"
                        network.setOptions({
                            edges: {
                                color: {
                                    inherit: true,
                                    highlight: '#68E114',
                                },
                                width: 1,
                                dashes: false
                            },
                        });
                        console.log(underlayPathMap)
                        console.log(underlayBackupPathMap)
                        if (underlayPathMap.size>0) {
                            if (underlayPathMap.has(edgeId) || underlayBackupPathMap.has(edgeId)) {
                                const allEdges = network.body.data.edges.get();
                                let underlayPaths = []
                                let underlayBackupPaths = []
                                let underlayPathsGet = false
                                let underlayBackupPathsGet = false
                                if (underlayPathMap.has(edgeId)) {
                                    underlayPathsGet = underlayPathMap.get(edgeId)
                                }
                                if (underlayBackupPathMap.has(edgeId)) {
                                    underlayBackupPathsGet = underlayBackupPathMap.get(edgeId)
                                }

                                if (underlayPathsGet && underlayPathsGet.length > 0) {
                                    underlayPathsGet.map((path) => {
                                        underlayPaths.push("WDM" + path["unnumbered-link-hop"]["node-id"] + "-" + path["unnumbered-link-hop"]["link-tp-id"].toString())
                                    })
                                }
                                if (underlayBackupPathsGet && underlayBackupPathsGet.length > 0) {
                                    underlayBackupPathsGet.map((path) => {
                                        if (path && path.length > 0) {
                                            path.map((element) => {
                                                underlayBackupPaths.push("WDM" + element["unnumbered-link-hop"]["node-id"] + "-" + element["unnumbered-link-hop"]["link-tp-id"].toString())
                                            })
                                        }
                                    })
                                }
                                allEdges.forEach(e => {
                                    if (underlayPaths.includes(e.from) || e.id == edgeId) {
                                        network.body.data.edges.update({ id: e.id, color: { color: '#68E114' }, width: 4 });
                                    }
                                    if (underlayBackupPaths.includes(e.from)) {
                                        network.body.data.edges.update({ id: e.id, dashes: true, color: { color: '#F98E30' }, width: 4 });
                                    }
                                });
                            } else {
                                if (!(edgeId === "OTNLabel" || edgeId === "WDMLabel" || edgeId === "L3Label")) {
                                    network.setOptions({
                                        edges: {
                                            color: {
                                                color: '#000000',
                                            },
                                            width: 1,
                                            dashes: false
                                        },
                                    });
                                    network.body.data.edges.update({ id: edgeId, color: { color: '#000000' }, width: 2, dashes: false });
                                }
                            }
                        }

                        if (edgeId !== "OTNLabel" && edgeId !== "WDMLabel" && edgeId !== "L3Label") {
                            if (edgeId.includes("OTN")) {
                                networks.map((item) => {
                                    if (checkNetworkType(item) === "OTN") {
                                        setModelTitle("IETF Network Link Model Instance")
                                        setSelectedEdge(item["ietf-network-topology:link"].find(link => link['link-id'] === sourceBundle));
                                        setIsOpen(true);
                                    }
                                })
                            }
                            if (edgeId.includes("WDM")) {
                                networks.map((item) => {
                                    if (checkNetworkType(item) === "WDM") {
                                        setModelTitle("IETF Network Link Model Instance")
                                        setSelectedEdge(item["ietf-network-topology:link"].find(link => link['link-id'] === sourceBundle));
                                        setIsOpen(true);
                                    }
                                })
                            }
                            if (edgeId.includes("L3")) {
                                networks.map((item) => {
                                    if (checkNetworkType(item) === "l3") {
                                        console.log("nodeIdSource:", nodeIdSource)
                                        console.log("TpSource:", tpIdSource)
                                        console.log("nodeIdDest:", nodeIdDest)
                                        console.log("TpDest:", tpIdDest)
                                        setModelTitle("Network Link Model Instance")
                                        setSelectedEdge(item["ietf-network-topology:link"].find(link => link['source']["source-node"] === nodeIdSource
                                            && link['source']["source-tp"] === tpIdSource && link['destination']["dest-node"] === nodeIdDest
                                            && link['destination']["dest-tp"] === tpIdDest));
                                        setIsOpen(true);
                                    }
                                })
                            }
                        }


                    }
                }
            )
            network.on('click', function (params) {
                const { edges } = params;
                if (edges.length > 0) {
                    const clickedEdgeId = edges[0];

                    network.setOptions({
                        edges: {
                            color: {
                                inherit: true,
                                highlight: '#68E114',
                            },
                            width: 1,
                            dashes: false
                        },
                    });
                    console.log(underlayPathMap)
                    console.log(underlayBackupPathMap)
                    if (underlayPathMap.size>0) {
                        if (underlayPathMap.has(clickedEdgeId) || underlayBackupPathMap.has(clickedEdgeId)) {
                            const allEdges = network.body.data.edges.get();
                            let underlayPaths = []
                            let underlayBackupPaths = []
                            let underlayPathsGet = false
                            let underlayBackupPathsGet = false
                            if (underlayPathMap.has(clickedEdgeId)) {
                                underlayPathsGet = underlayPathMap.get(clickedEdgeId)
                            }
                            if (underlayBackupPathMap.has(clickedEdgeId)) {
                                underlayBackupPathsGet = underlayBackupPathMap.get(clickedEdgeId)
                            }

                            if (underlayPathsGet && underlayPathsGet.length > 0) {
                                underlayPathsGet.map((path) => {
                                    underlayPaths.push("WDM" + path["unnumbered-link-hop"]["node-id"] + "-" + path["unnumbered-link-hop"]["link-tp-id"].toString())
                                })
                            }
                            if (underlayBackupPathsGet && underlayBackupPathsGet.length > 0) {
                                underlayBackupPathsGet.map((path) => {
                                    if (path && path.length > 0) {
                                        path.map((element) => {
                                            underlayBackupPaths.push("WDM" + element["unnumbered-link-hop"]["node-id"] + "-" + element["unnumbered-link-hop"]["link-tp-id"].toString())
                                        })
                                    }
                                })
                            }
                            allEdges.forEach(e => {
                                if (underlayPaths.includes(e.from) || e.id == clickedEdgeId) {
                                    network.body.data.edges.update({ id: e.id, color: { color: '#68E114' }, width: 4 });
                                }
                                if (underlayBackupPaths.includes(e.from)) {
                                    network.body.data.edges.update({ id: e.id, dashes: true, color: { color: '#F98E30' }, width: 4 });
                                }
                            });
                        } else {
                            if (!(clickedEdgeId === "OTNLabel" || clickedEdgeId === "WDMLabel" || clickedEdgeId === "L3Label")) {
                                network.setOptions({
                                    edges: {
                                        color: {
                                            color: '#000000',
                                        },
                                        width: 1,
                                        dashes: false
                                    },
                                });
                                network.body.data.edges.update({ id: clickedEdgeId, color: { color: '#000000' }, width: 2, dashes: false });
                            }
                        }

                    }

                }
            });

            network.on('deselectEdge', function () {
                const tooltip = tooltipRef.current;
                if (tooltip) {
                    tooltip.style.display = 'none';
                }
                const allEdges = network.body.data.edges.get();
                allEdges.forEach(edge => {
                    if (!(edge.id === "OTNLabel" || edge.id === "WDMLabel" || edge.id === "L3Label")) {
                        network.body.data.edges.update({
                            id: edge.id,
                            dashes: false,
                            color: {
                                color: '#000000',
                            },
                            width: 1
                        });
                    }

                });
            });

            network.on('hoverEdge', function (params) {
                const { edge, pointer } = params;
                const tooltip = tooltipRef.current;
                if (tooltip) {
                    if (!(edge.includes("OTNLabel") || edge.includes("WDMLabel") || edge.includes("L3Label"))) {
                        const labelDisplay = linklabelName.find(e => e.id === edge).label
                        tooltip.style.left = `${pointer.DOM.x}px`;
                        tooltip.style.top = `${pointer.DOM.y}px`;
                        tooltip.innerHTML = labelDisplay;
                        tooltip.style.display = 'block';

                    }
                    if (edge.includes("OTNLabel")) {
                        const labelDisplay = "te-topology-identifier:<br>" + "&nbsp;&nbsp;&nbsp provider-id: " + OTNLabelTooltip["provider-id"] + "<br>" + "&nbsp;&nbsp;&nbsp client-id: "
                            + OTNLabelTooltip["client-id"] + "<br>" + "&nbsp;&nbsp;&nbsp topoplogy-id: " + OTNLabelTooltip["topology-id"] + "<br>" + "network-types: ietf-otn-topology:otn-topology"
                        tooltip.style.left = `${pointer.DOM.x}px`;
                        tooltip.style.top = `${pointer.DOM.y}px`;
                        tooltip.innerHTML = labelDisplay;
                        tooltip.style.display = 'block';
                    }
                    if (edge.includes("WDMLabel")) {
                        const labelDisplay = "te-topology-identifier:<br>" + "&nbsp;&nbsp;&nbsp provider-id: " + WDMLabelTooltip["provider-id"] + "<br>" + "&nbsp;&nbsp;&nbsp client-id: "
                            + WDMLabelTooltip["client-id"] + "<br>" + "&nbsp;&nbsp;&nbsp topoplogy-id: " + WDMLabelTooltip["topology-id"] + "<br>" + "network-types: ietf-wson-topology:wson-topology"
                        tooltip.style.left = `${pointer.DOM.x}px`;
                        tooltip.style.top = `${pointer.DOM.y}px`;
                        tooltip.innerHTML = labelDisplay;
                        tooltip.style.display = 'block';
                    }
                }
            });
            network.on('hoverNode', function (params) {
                const { node, pointer } = params;
                const tooltip = tooltipRef.current;
                if (tooltip) {
                    if (!(node.includes("OTNLabel") || node.includes("WDMLabel") || node.includes("L3Label"))) {
                        const labelDisplay = nodelabelName.find(e => e.id === node).label
                        tooltip.style.left = `${pointer.DOM.x}px`;
                        tooltip.style.top = `${pointer.DOM.y}px`;
                        tooltip.innerHTML = labelDisplay;
                        tooltip.style.display = 'block';

                    }
                }
                if (tooltip && node) {

                }
            });

            network.on('blurEdge', function () {
                const tooltip = tooltipRef.current;
                if (tooltip) {
                    tooltip.style.display = 'none';
                }
            });
            network.on('blurNode', function () {
                const tooltip = tooltipRef.current;
                if (tooltip) {
                    tooltip.style.display = 'none';
                }
            });
        }

        // Cleanup event listeners on unmount
        return () => {
            if (network) {
                network.off("dragging");
                network.off("dragEnd");
                network.off('click');
                network.off('deselectEdge');
                network.off('hoverEdge');
                network.off('blurEdge');
                network.off('doubleClick');
            }
        };
    }, [networkRef.current]); // Add graph as a dependency to ensure the useEffect runs after data is fetched and nodes are modified

    const options = {
        interaction: {
            selectable: true,
            hover: true
        },
        clickToUse: false,
        physics: {
            enabled: false,
        },
        nodes: {
            font: {
                color: "#000",        // Font color (black)
                size: 8,             // Font size for labels
                // align: "center",      // Align text in the center of the shape
            },
        },
        groups: {
            // Main nodes are square
            main: {
                shape: "box",                        // Box shape for square nodes
                borderRadius: 0,
                font: {
                    color: "#000",
                    size: 14,
                    align: "center"
                },                     // No rounded corners for square nodes
                color: { background: "lightblue", border: "black" }, // Square node color and border
                widthConstraint: { minimum: 80, maximum: 80 },       // Control square width
                heightConstraint: { minimum: 80, maximum: 80 },      // Control square height

            },
            // Port nodes are circular
            port: {
                size: 4,
                shape: "circle",                     // Circular shape for ports
                // Control square height                            // Smaller size for ports
                color: { background: "orange", border: "black" },    // Circle color and border
            },
        },
        edges: {
            arrows: {
                to: {
                    enabled: true,
                    scaleFactor: 0.7,
                    // type: "image"
                },
                from: {
                    enabled: true,
                    scaleFactor: 0.7,
                    // type: "image"
                }
            },
            color: "#000000"
        },
        height: "1000px",
    };





    const getGraph = () => {
        console.log(data)
        if (data != "" && data != null) {
            let OTNLabelToolTipJson
            let WDMLabelToolTipJson
            let OTNNetworkName
            let WDMNetworkName
            let L3NetworkName
            let nodes = []
            let edges = []
            let underlayPathMap = new Map()
            let underlayBackupPathMap = new Map()
            let LinklabelList = []
            let NodelabelList = []
            let Nodes = []
            let NodesOtn = []
            let NodesL3 = []
            let nodesConnectRelation = []
            let nodesConnectRelationOtn = []
            let nodesConnectRelationL3 = []
            let nodesConnectRelationD3 = []
            let nodesConnectRelationD3Otn = []
            let nodesConnectRelationD3L3 = []
            let linkWithDualAndUni = []
            let linkWithDualAndUniOtn = []
            let linkWithDualAndUniL3 = []

            const networks = data["ietf-network:networks"]["network"]
            networks.map((item) => {

                if (checkNetworkType(item) === "l3") {
                    const NodeList = item["node"]
                    const LinkList = item["ietf-network-topology:link"]
                    const filteredLink = LinkList.filter(item => item.hasOwnProperty('destination'));
                    let labelToolTipJson
                    if ("ietf-te-topology:te-topology-identifier" in item) {
                        labelToolTipJson = item["ietf-te-topology:te-topology-identifier"]

                    } else {
                        labelToolTipJson = item["network-types"]
                    }
                    if ("ietf-te-topology:te" in item) {
                        L3NetworkName = item["ietf-te-topology:te"]["name"]
                    } else {
                        L3NetworkName = item["network-id"]
                    }
                    const dualLinks = findDualLinks(filteredLink);
                    console.log("l3 Dual Links:", dualLinks);

                    // Find uni-directional links
                    const uniDirectionalLinks = getUniDirectionalLinks(
                        filteredLink,
                        dualLinks
                    );
                    console.log("l3 Uni-Directional Links:", uniDirectionalLinks);


                    const dualLinksToUni = transformDualLinksToUniDirectional(dualLinks)


                    linkWithDualAndUniL3 = uniDirectionalLinks.concat(dualLinksToUni)
                    //Find Connection relations between nodes
                    nodesConnectRelationL3 = getConnectionInfoOfNodes(filteredLink);
                    nodesConnectRelationD3L3 = getConnectionInfoOfNodesD3(filteredLink);
                    console.log("L3Uni-Directional Links:", uniDirectionalLinks);
                    NodeList.map((node) => {
                        NodelabelList.push({
                            id: "L3" + node["node-id"]
                            , label: "Node name: " + node["ietf-l3-unicast-topology:l3-node-attributes"]["name"] + "<br>" + "Node ID: " + node["node-id"] +
                                "<br>" + "prefix:" + node["ietf-l3-unicast-topology:l3-node-attributes"]["prefix"][0]["prefix"]
                        })
                        nodes.push({ id: "L3" + node["node-id"], label: node["ietf-l3-unicast-topology:l3-node-attributes"]["name"], group: "main" })

                        const tps = node["ietf-network-topology:termination-point"].map((tp) => {
                            NodelabelList.push({
                                id: "L3" + node["node-id"] + "-" + tp["tp-id"]
                                , label: "Tp ID: " + tp["tp-id"] + "<br>" + "ip-address-ipv4: " + tp["ietf-l3-unicast-topology:l3-termination-point-attributes"]["ip-address"][0] +
                                    "<br>" + "ip-address-ipv6: " + tp["ietf-l3-unicast-topology:l3-termination-point-attributes"]["ip-address"][1]
                            })

                            nodes.push({ id: "L3" + node["node-id"] + "-" + tp["tp-id"], label: "tp", group: "port" })
                            return { tpId: tp["tp-id"] };
                        })// Extract tp IDs

                        // Add the nodeId and its tps to the dictionary
                        NodesL3.push({ "id": node["node-id"] });
                    })
                    if (dualLinks && dualLinks.length > 0) {
                        dualLinks.map((link) => {
                            LinklabelList.push({
                                id: "L3dual " + link.linkA + " to " + link.linkB
                                , label: "Link type: bidirectional link<br>" + "Link ID: " + link.linkA + "<br>" + "source A: " + link.linkA + ", source B: " + link.linkB
                            })
                            edges.push({
                                id: "L3dual " + link.linkA + " to " + link.linkB,
                                from: "L3" + link.linkA,
                                to: "L3" + link.linkB, arrows: "from, to"
                            })
                        })
                    }

                    if (uniDirectionalLinks && uniDirectionalLinks.length > 0) {
                        uniDirectionalLinks.map((link) => {
                            LinklabelList.push({
                                id: "L3Uni " + link["source"]["source-node"] + "-" + link["source"]["source-tp"] + " to " + link["destination"]["dest-node"] + "-" + link["destination"]["dest-tp"]
                                , label: "Link type: unidirectional link<br>" + "Link ID: " + link["source"]["source-node"] + "-" + link["source"]["source-tp"] + "<br>" +
                                    "source: " + link["source"]["source-node"] + "-" + link["source"]["source-tp"]
                                    + ", destination: " + link["destination"]["dest-node"] + "-" + link["destination"]["dest-tp"]
                            })
                            edges.push({
                                id: "L3Uni " + link["source"]["source-node"] + "-" + link["source"]["source-tp"] + " to " + link["destination"]["dest-node"] + "-" + link["destination"]["dest-tp"],
                                from: "L3" + link["source"]["source-node"] + "-" + link["source"]["source-tp"],
                                to: "L3" + link["destination"]["dest-node"] + "-" + link["destination"]["dest-tp"], arrows: "to"
                            })
                        })
                    }

                }




                if (checkNetworkType(item) === "OTN") {
                    OTNNetworkName = item["ietf-te-topology:te"]["name"]
                    const OTNNodeList = item["node"]
                    const OTNLinkList = item["ietf-network-topology:link"]
                    const filteredOTNLinkList = OTNLinkList.filter(item => item.hasOwnProperty('destination'));
                    OTNLabelToolTipJson = item["ietf-te-topology:te-topology-identifier"]
                    // Find dual links
                    const dualLinks = findDualLinks(filteredOTNLinkList);
                    console.log("Otn Dual Links:", dualLinks);

                    // Find uni-directional links
                    const uniDirectionalLinks = getUniDirectionalLinks(
                        filteredOTNLinkList,
                        dualLinks
                    );
                    console.log("Otn Uni-Directional Links:", uniDirectionalLinks);


                    const dualLinksToUni = transformDualLinksToUniDirectional(dualLinks)


                    linkWithDualAndUniOtn = uniDirectionalLinks.concat(dualLinksToUni)
                    //Find Connection relations between nodes
                    nodesConnectRelationOtn = getConnectionInfoOfNodes(filteredOTNLinkList);
                    nodesConnectRelationD3Otn = getConnectionInfoOfNodesD3(filteredOTNLinkList);
                    OTNNodeList.map((node) => {
                        NodelabelList.push({
                            id: "OTN" + node["node-id"]
                            , label: "OTN Layer<br>" + "Node name: " + node["ietf-te-topology:te"]["te-node-attributes"]["name"] + "<br>" + "Node ID: " + node["node-id"]
                        })
                        nodes.push({ id: "OTN" + node["node-id"], label: node["ietf-te-topology:te"]["te-node-attributes"]["name"], group: "main" })
                        const tps = node["ietf-network-topology:termination-point"].map((tp) => {
                            NodelabelList.push({
                                id: "OTN" + node["node-id"] + "-" + tp["tp-id"]
                                , label: "OTN Layer<br>" + "Tp ID: " + tp["tp-id"] + "<br>" + "ietf-te-topology:te-tp-id: " + tp["ietf-te-topology:te-tp-id"]
                            })

                            nodes.push({ id: "OTN" + node["node-id"] + "-" + tp["tp-id"], label: tp["tp-id"], group: "port" })
                            return { tpId: tp["tp-id"] };
                        })// Extract tp IDs

                        // Add the nodeId and its tps to the dictionary
                        NodesOtn.push({ "id": node["node-id"] });
                    })
                    if (dualLinks && dualLinks.length > 0) {
                        dualLinks.map((link) => {
                            LinklabelList.push({
                                id: "OTNdual " + link.linkA + " to " + link.linkB
                                , label: "OTN layer<br> Link type: bidirectional link<br>" + "Link ID:" + link.linkA + "<br>" + "source A: " + link.linkA + ", source B: " + link.linkB
                            })
                            edges.push({
                                id: "OTNdual " + link.linkA + " to " + link.linkB,
                                from: "OTN" + link.linkA,
                                to: "OTN" + link.linkB, arrows: "from, to"
                            })
                        })
                    }

                    if (uniDirectionalLinks && uniDirectionalLinks.length > 0) {
                        uniDirectionalLinks.map((link) => {
                            const linkId = "OTNUni " + link["source"]["source-node"] + "-" + link["source"]["source-tp"] + " to " + link["destination"]["dest-node"] + "-" + link["destination"]["dest-tp"]
                            if ("ietf-te-topology:te" in link) {
                                LinklabelList.push({
                                    id: "OTNUni " + link["source"]["source-node"] + "-" + link["source"]["source-tp"] + " to " + link["destination"]["dest-node"] + "-" + link["destination"]["dest-tp"]
                                    , label: "OTN layer<br> Link type: unidirectional link<br>" + "Link ID: " + link["source"]["source-node"] + "-" + link["source"]["source-tp"] + "<br>" +
                                        "source: " + link["source"]["source-node"] + "-" + link["source"]["source-tp"]
                                        + ", destination: " + link["destination"]["dest-node"] + "-" + link["destination"]["dest-tp"] + "<br>" + "Latency: " + link["ietf-te-topology:te"]["te-link-attributes"]["te-delay-metric"] + "ms"
                                })
                                const underlayPaths = link["ietf-te-topology:te"]["te-link-attributes"]["underlay"]["primary-path"]["path-element"]
                                if (underlayPaths && underlayPaths.length > 0) {
                                    underlayPathMap.set(linkId, []);
                                    underlayPaths.map((underlayPath) => {
                                        underlayPathMap.get(linkId).push(underlayPath);
                                    })
                                }
                                const underlayBackupPaths = link["ietf-te-topology:te"]["te-link-attributes"]["underlay"]["backup-path"]
                                if (underlayBackupPaths && underlayBackupPaths.length > 0) {
                                    underlayBackupPathMap.set(linkId, [])
                                    underlayBackupPaths.map((underlayBackupPath) => {
                                        const underlayBackupPathElementList = underlayBackupPath["path-element"]

                                        if (underlayBackupPathElementList && underlayBackupPathElementList.length > 0) {
                                            let backupPathWithElements = []
                                            underlayBackupPathElementList.map((underlayBackupPathElement) => {
                                                backupPathWithElements.push(underlayBackupPathElement)
                                            })
                                            underlayBackupPathMap.get(linkId).push(backupPathWithElements)
                                        }
                                    })
                                }
                            } else {
                                LinklabelList.push({
                                    id: "OTNUni " + link["source"]["source-node"] + "-" + link["source"]["source-tp"] + " to " + link["destination"]["dest-node"] + "-" + link["destination"]["dest-tp"]
                                    , label: "OTN layer<br> Link type: unidirectional link<br>" + "source: " + link["source"]["source-node"] + "-" + link["source"]["source-tp"]
                                        + ", destination: " + link["destination"]["dest-node"] + "-" + link["destination"]["dest-tp"]
                                })
                            }
                            edges.push({
                                id: "OTNUni " + link["source"]["source-node"] + "-" + link["source"]["source-tp"] + " to " + link["destination"]["dest-node"] + "-" + link["destination"]["dest-tp"],
                                from: "OTN" + link["source"]["source-node"] + "-" + link["source"]["source-tp"],
                                to: "OTN" + link["destination"]["dest-node"] + "-" + link["destination"]["dest-tp"], arrows: "to"
                            })
                        })
                    }

                }
                if (checkNetworkType(item) === "WDM") {
                    WDMLabelToolTipJson = item["ietf-te-topology:te-topology-identifier"]
                    WDMNetworkName = item["ietf-te-topology:te"]["name"]
                    const WDMNodeList = item["node"]
                    const WDMLinkList = item["ietf-network-topology:link"]
                    const filteredWDMLinkList = WDMLinkList.filter(item => item.hasOwnProperty('destination'));
                    // Find dual links
                    const dualLinks = findDualLinks(filteredWDMLinkList);
                    const dualLinksToUni = transformDualLinksToUniDirectional(dualLinks)

                    console.log("WDMDual Links:", dualLinks);

                    // Find uni-directional links
                    const uniDirectionalLinks = getUniDirectionalLinks(
                        filteredWDMLinkList,
                        dualLinks
                    );
                    linkWithDualAndUni = uniDirectionalLinks.concat(dualLinksToUni)

                    //Find Connection relations between nodes
                    nodesConnectRelation = getConnectionInfoOfNodes(filteredWDMLinkList);
                    nodesConnectRelationD3 = getConnectionInfoOfNodesD3(filteredWDMLinkList);
                    console.log("WDMUni-Directional Links:", uniDirectionalLinks);
                    WDMNodeList.map((node) => {
                        NodelabelList.push({
                            id: "WDM" + node["node-id"]
                            , label: "WDM Layer<br>" + "Node name: " + node["ietf-te-topology:te"]["te-node-attributes"]["name"] + "<br>" + "Node ID: " + node["node-id"]
                        })
                        nodes.push({ id: "WDM" + node["node-id"], label: node["ietf-te-topology:te"]["te-node-attributes"]["name"], group: "main" })

                        const tps = node["ietf-network-topology:termination-point"].map((tp) => {
                            NodelabelList.push({
                                id: "WDM" + node["node-id"] + "-" + tp["tp-id"]
                                , label: "WDM Layer<br>" + "Tp ID: " + tp["tp-id"] + "<br>" + "ietf-te-topology:te-tp-id: " + tp["ietf-te-topology:te-tp-id"]
                            })

                            nodes.push({ id: "WDM" + node["node-id"] + "-" + tp["tp-id"], label: tp["tp-id"], group: "port" })
                            return { tpId: tp["tp-id"] };
                        })// Extract tp IDs

                        // Add the nodeId and its tps to the dictionary
                        Nodes.push({ "id": node["node-id"] });
                    })
                    if (dualLinks && dualLinks.length > 0) {
                        dualLinks.map((link) => {
                            LinklabelList.push({
                                id: "WDMdual " + link.linkA + " to " + link.linkB
                                , label: "WDM layer<br> Link type: bidirectional link<br>" + "Link ID: " + link.linkA + "<br>" + "source A: " + link.linkA + ", source B: " + link.linkB
                            })
                            edges.push({
                                id: "WDMdual " + link.linkA + " to " + link.linkB,
                                from: "WDM" + link.linkA,
                                to: "WDM" + link.linkB, arrows: "from, to"
                            })
                        })
                    }

                    if (uniDirectionalLinks && uniDirectionalLinks.length > 0) {
                        uniDirectionalLinks.map((link) => {
                            LinklabelList.push({
                                id: "WDMUni " + link["source"]["source-node"] + "-" + link["source"]["source-tp"] + " to " + link["destination"]["dest-node"] + "-" + link["destination"]["dest-tp"]
                                , label: "WDM layer<br> Link type: unidirectional link<br>" + "Link ID: " + link["source"]["source-node"] + "-" + link["source"]["source-tp"] + "<br>" +
                                    "source: " + link["source"]["source-node"] + "-" + link["source"]["source-tp"]
                                    + ", destination: " + link["destination"]["dest-node"] + "-" + link["destination"]["dest-tp"]
                            })
                            edges.push({
                                id: "WDMUni " + link["source"]["source-node"] + "-" + link["source"]["source-tp"] + " to " + link["destination"]["dest-node"] + "-" + link["destination"]["dest-tp"],
                                from: "WDM" + link["source"]["source-node"] + "-" + link["source"]["source-tp"],
                                to: "WDM" + link["destination"]["dest-node"] + "-" + link["destination"]["dest-tp"], arrows: "to"
                            })
                        })
                    }

                }
            })
            if (NodesL3.length > 0) {
                const nodeWithLinkedNodesMap = createNodeMap(NodesL3, nodesConnectRelationL3)
                console.log("nodesConnectRelationL3", nodesConnectRelationL3)
                console.log("nodeWithLinkedNodesMap", nodeWithLinkedNodesMap)
                const canvasBounds = {
                    x: [-400, 400], // x ranges from -500 to 500
                    y: [-400, 400], // y ranges from -500 to 500
                };
                const simulationL3 = d3.forceSimulation(NodesL3)
                    .force("link", d3.forceLink(nodesConnectRelationD3L3).id(d => d.id).distance(100))
                    .force("charge", d3.forceManyBody().strength(-400))
                    .force("center", d3.forceCenter(0, 0))
                    .force("collision", d3.forceCollide().radius(30));
                simulationL3.on("end", () => {
                    // Clamp node positions within canvas bounds
                    NodesL3.forEach(node => {
                        node.x = Math.max(canvasBounds.x[0], Math.min(canvasBounds.x[1], node.x)); // Clamp x
                        node.y = Math.max(canvasBounds.y[0], Math.min(canvasBounds.y[1], node.y)); // Clamp y
                    });
                    const nodeToTpsMap = nodes.reduce((map, item) => {
                        if (item.group === "port") {
                            // Extract the node ID from the TP ID (e.g., "L34.4.4.5-to_HL5-2-2" → "L34.4.4.5")
                            const firstHyphen = item.id.indexOf('-');

                            const nodeId = item.id.substring(2, firstHyphen); // "5.5.5.1"
                            const tpId = item.id.substring(firstHyphen + 1); // "eth-1/0/19.55"
                            if (!map[nodeId]) map[nodeId] = [];
                            map[nodeId].push(tpId);
                        }
                        return map;
                    }, {});
                    console.log("NodeL3", NodesL3)
                    const nodesInDirectionMap = categorizeNodesByDirectionClockwise(nodeWithLinkedNodesMap, NodesL3)
                    const tpsOfNodesDirectional = generateTpsOfNodesDirectional(nodesInDirectionMap, linkWithDualAndUniL3, nodeToTpsMap)
                    setNodeWithLinkedNodesMapGlobalL3(nodeWithLinkedNodesMap)
                    setLinkWithDualAndUniGlobalL3(linkWithDualAndUniL3)
                    console.log("Final node positions:L3", NodesL3);
                    console.log("L3 nodes:", nodes)
                    console.log("tpsOfNodesDirectional", tpsOfNodesDirectional)
                    const nodesWithPositionL3 = nodes.map(element => {
                        const ratio = 2
                        const ratioX = 3
                        const yCentra = 0
                        if (element.id.includes("L3")) {
                            if (element.id.includes('-')) {
                                const firstHyphen = element.id.indexOf('-');

                                const nodeId = element.id.substring(0, firstHyphen); // "L35.5.5.1"
                                const tpId = element.id.substring(firstHyphen + 1); // "eth-1/0/19.55"
                                const node = NodesL3.find((n) => "L3" + n.id === nodeId);
                                const NodeIp = node.id
                                const result = findTpIdDirectionAndIndex(tpsOfNodesDirectional, NodeIp, tpId)
                                const direction = result.direction
                                const index = result.index
                                if (direction === "up") {
                                    const length = tpsOfNodesDirectional[NodeIp]["up"].length
                                    if (length === 4) {
                                        return { ...element, x: node.x * ratioX + (index * 20 - 30), y: yCentra + (node.y - yCentra) * ratio + 50 }

                                    } else if (length === 3) {
                                        return { ...element, x: node.x * ratioX + (80 / (length + 1) * (index + 1) - 40), y: yCentra + (node.y - yCentra) * ratio + 50 }
                                    } else {
                                        return { ...element, x: node.x * ratioX + (60 / (length + 1) * (index + 1) - 30), y: yCentra + (node.y - yCentra) * ratio + 50 }
                                    }
                                }
                                if (direction === "right") {
                                    const length = tpsOfNodesDirectional[NodeIp]["right"].length
                                    if (length === 4) {
                                        return { ...element, y: yCentra + (node.y - yCentra) * ratio - (index * 20 - 30), x: node.x * ratioX + 50 }

                                    } else if (length === 3) {
                                        return { ...element, y: yCentra + (node.y - yCentra) * ratio - (80 / (length + 1) * (index + 1) - 40), x: node.x * ratioX + 50 }
                                    } else {
                                        return { ...element, y: yCentra + (node.y - yCentra) * ratio - (60 / (length + 1) * (index + 1) - 30), x: node.x * ratioX + 50 }
                                    }

                                }
                                if (direction === "down") {
                                    const length = tpsOfNodesDirectional[NodeIp]["down"].length
                                    if (length === 4) {
                                        return { ...element, x: node.x * ratioX - (index * 20 - 30), y: yCentra + (node.y - yCentra) * ratio - 50 }

                                    } else if (length === 3) {
                                        return { ...element, x: node.x * ratioX - (80 / (length + 1) * (index + 1) - 40), y: yCentra + (node.y - yCentra) * ratio - 50 }
                                    } else {
                                        return { ...element, x: node.x * ratioX - (60 / (length + 1) * (index + 1) - 30), y: yCentra + (node.y - yCentra) * ratio - 50 }
                                    }

                                }
                                if (direction === "left") {
                                    const length = tpsOfNodesDirectional[NodeIp]["left"].length
                                    if (length === 4) {
                                        return { ...element, y: yCentra + (node.y - yCentra) * ratio + (index * 20 - 30), x: node.x * ratioX - 50 }

                                    } else if (length === 3) {
                                        return { ...element, y: yCentra + (node.y - yCentra) * ratio + (80 / (length + 1) * (index + 1) - 40), x: node.x * ratioX - 50 }
                                    } else {
                                        return { ...element, y: yCentra + (node.y - yCentra) * ratio + (60 / (length + 1) * (index + 1) - 30), x: node.x * ratioX - 50 }
                                    }

                                }




                            } else {

                                const node = NodesL3.find((n) => "L3" + n.id === element.id);
                                const x = node.x * ratioX
                                const y = yCentra + (node.y - yCentra) * ratio
                                return { ...element, x: x, y: y }
                            }

                        }

                    })
                    nodesWithPositionL3.push({ id: "L3LabelA", label: "", shape: "dot", size: 0, color: '#000000', x: -200, y: -400 })
                    nodesWithPositionL3.push({ id: "L3LabelB", label: "", shape: "dot", size: 0, color: '#000000', x: 200, y: -400 })
                    edges.push({
                        id: "L3Label",
                        from: "L3LabelA", to: "L3LabelB", font: {
                            size: 24,
                            color: 'black',
                            bold: true
                        }, label: "Network Id: " + L3NetworkName, color: 'rgba(0,0,0,0)'
                    })
                    const graph = { nodes: nodesWithPositionL3.filter((node) => node !== undefined), edges: edges }
                    setGraph(graph)
                    setLinkLabelName(LinklabelList)
                    setNodeLabelName(NodelabelList)
                    console.log("graph", graph)
                    console.log(underlayPathMap)
                });


            }
            else if (Nodes.length > 0 && NodesOtn.length > 0) {
                const nodeWithLinkedNodesMap = createNodeMap(Nodes, nodesConnectRelation)
                const nodeWithLinkedNodesMapOtn = createNodeMap(NodesOtn, nodesConnectRelationOtn)
                console.log(nodeWithLinkedNodesMap)

                const canvasBoundary = { x: [-400, 400], y: [-400, 400] };

                // // Force-directed layout parameters
                // const repulsionStrength = 1000000; // Repulsion force between nodes
                // const attractionStrength = 0.013; // Attraction force along links
                // const gravityStrength = 0.1; // Gravity force toward the center
                // const damping = 0.9; // Damping factor to slow down motion over time
                // const maxIterations = 100; // Maximum number of iterations

                // // Initialize node positions randomly within the canvas boundary
                // const nodesWithCoordinates = Nodes.map((node) => ({
                //     ...node,
                //     x: Math.random() * (canvasBoundary.x[1] - canvasBoundary.x[0]) + canvasBoundary.x[0],
                //     y: Math.random() * (canvasBoundary.y[1] - canvasBoundary.y[0]) + canvasBoundary.y[0],
                //     vx: 0, // Velocity in x direction
                //     vy: 0, // Velocity in y direction
                // }));

                // // Create a map for quick node lookup
                // const nodeMap = new Map(nodesWithCoordinates.map((node) => [node.id, node]));

                // // Force-directed layout simulation
                // for (let iteration = 0; iteration < 0; iteration++) {
                //     // Apply repulsion force between all nodes
                //     for (let i = 0; i < nodesWithCoordinates.length; i++) {
                //         for (let j = i + 1; j < nodesWithCoordinates.length; j++) {
                //             const node1 = nodesWithCoordinates[i];
                //             const node2 = nodesWithCoordinates[j];

                //             const dx = Math.abs(node1.x - node2.x);
                //             const dy = Math.abs(node1.y - node2.y);
                //             const distance = Math.sqrt(dx * dx + dy * dy);

                //             // Avoid division by zero
                //             if (distance > 0) {
                //                 const force = Math.min(repulsionStrength / (distance * distance), 10);
                //                 console.log(force)
                //                 if (node1.x > node2.x) {
                //                     node1.vx += force;
                //                     node2.vx -= force;
                //                 } else {
                //                     node1.vx -= force;
                //                     node2.vx += force;
                //                 }

                //                 if (node1.y > node2.y) {
                //                     node1.vy += force;
                //                     node2.vy -= force;
                //                 } else {
                //                     node1.vy -= force;
                //                     node2.vy += force;
                //                 }

                //                 // node1.vx += force * dx;
                //                 // node1.vy += force * dy;
                //                 // node2.vx -= force * dx;
                //                 // node2.vy -= force * dy;
                //             }
                //         }
                //     }

                //     // Apply attraction force along links
                //     nodesConnectRelation.forEach((link) => {
                //         const sourceNode = nodeMap.get(link.source);
                //         const destNode = nodeMap.get(link.dest);

                //         if (sourceNode && destNode) {
                //             const dx = Math.abs(destNode.x - sourceNode.x);
                //             const dy = Math.abs(destNode.y - sourceNode.y);
                //             const distance = Math.sqrt(dx * dx + dy * dy);

                //             const force = Math.min(attractionStrength * distance, 10);
                //             console.log(force)
                //             if (sourceNode.x < destNode.x) {
                //                 sourceNode.vx += force;
                //                 destNode.vx -= force;
                //             } else {
                //                 sourceNode.vx -= force;
                //                 destNode.vx += force;
                //             }

                //             if (sourceNode.y < destNode.y) {
                //                 sourceNode.vy += force;
                //                 sourceNode.vy -= force;
                //             } else {
                //                 sourceNode.vy -= force;
                //                 destNode.vy += force;
                //             }

                //             // sourceNode.vx += force * dx;
                //             // sourceNode.vy += force * dy;
                //             // destNode.vx -= force * dx;
                //             // destNode.vy -= force * dy;
                //         }
                //     });

                //     // Apply gravity force toward the center
                //     nodesWithCoordinates.forEach((node) => {
                //         const dx = 0 - node.x; // Center is at (0, 0)
                //         const dy = 0 - node.y;

                //         node.vx += gravityStrength * dx;
                //         node.vy += gravityStrength * dy;
                //     });

                //     // Update positions and apply damping
                //     nodesWithCoordinates.forEach((node) => {
                //         node.vx *= Math.pow(damping, iteration);
                //         node.vy *= Math.pow(damping, iteration);
                //         node.x += node.vx;
                //         node.y += node.vy;



                //         // Keep nodes within the canvas boundary
                //         node.x = Math.max(canvasBoundary.x[0], Math.min(canvasBoundary.x[1], node.x));
                //         node.y = Math.max(canvasBoundary.y[0], Math.min(canvasBoundary.y[1], node.y));
                //     });
                //     // console.log("output index of "+ iteration+" is:", nodesWithCoordinates)
                // }

                // // Output the final node positions
                // console.log("Nodes with coordinates:", nodesWithCoordinates);

                const canvasBounds = {
                    x: [-500, 500], // x ranges from -500 to 500
                    y: [0, 500], // y ranges from -500 to 500
                };

                const canvasBoundsOtn = {
                    x: [-500, 500], // x ranges from -500 to 500
                    y: [-500, 0], // y ranges from -500 to 500
                };

                console.log(nodesConnectRelationD3)
                const simulation = d3.forceSimulation(Nodes)
                    .force("link", d3.forceLink(nodesConnectRelationD3).id(d => d.id).distance(100))
                    .force("charge", d3.forceManyBody().strength(-300))
                    .force("center", d3.forceCenter(0, 250))
                    .force("collision", d3.forceCollide().radius(30));

                const simulationOtn = d3.forceSimulation(NodesOtn)
                    .force("link", d3.forceLink(nodesConnectRelationD3Otn).id(d => d.id).distance(100))
                    .force("charge", d3.forceManyBody().strength(-300))
                    .force("center", d3.forceCenter(0, -120))
                    .force("collision", d3.forceCollide().radius(30));

                simulation.on("end", () => {
                    Nodes.forEach(node => {
                        node.x = Math.max(canvasBounds.x[0], Math.min(canvasBounds.x[1], node.x)); // Clamp x
                        node.y = Math.max(canvasBounds.y[0], Math.min(canvasBounds.y[1], node.y)); // Clamp y
                    });
                    const nodeToTpsMap = nodes.reduce((map, item) => {
                        if (item.id.includes("WDM") && item.group === "port") {
                            // Extract the node ID from the TP ID (e.g., "L34.4.4.5-to_HL5-2-2" → "L34.4.4.5")
                            const firstHyphen = item.id.indexOf('-');

                            const nodeId = item.id.substring(3, firstHyphen);
                            const tpId = item.id.substring(firstHyphen + 1);
                            if (!map[nodeId]) map[nodeId] = [];
                            map[nodeId].push(tpId);
                        }
                        return map;
                    }, {});
                    console.log("WDMNodeToTpsMap", nodeToTpsMap)
                    const nodesInDirectionMap = categorizeNodesByDirectionClockwise(nodeWithLinkedNodesMap, Nodes)
                    const tpsOfNodesDirectional = generateTpsOfNodesDirectional(nodesInDirectionMap, linkWithDualAndUni, nodeToTpsMap)
                    setNodesGlobal(Nodes)
                    setNodeWithLinkedNodesMapGlobal(nodeWithLinkedNodesMap)
                    setLinkWithDualAndUniGlobal(linkWithDualAndUni)


                    console.log("nodesInDirection", nodesInDirectionMap)
                    console.log("linkWithDualAndUni", linkWithDualAndUni)
                    console.log("tpsOfNodesDirectional", tpsOfNodesDirectional)
                    const nodesWithPosition = nodes.map(element => {
                        const ratio = 2
                        const ratioX = 3
                        if (element.id.includes("WDM")) {
                            if (element.id.includes('-')) {
                                const [nodeId, tpId] = element.id.split('-');
                                const node = Nodes.find((n) => "WDM" + n.id === nodeId);
                                const NodeIp = node.id
                                const result = findTpIdDirectionAndIndex(tpsOfNodesDirectional, NodeIp, tpId)
                                const direction = result.direction
                                const index = result.index

                                if (direction === "up") {
                                    const length = tpsOfNodesDirectional[NodeIp]["up"].length
                                    const preLength = tpsOfNodesDirectional[NodeIp]["left"].length
                                    if (length === 4) {
                                        return { ...element, x: node.x * ratioX + (index * 20 - 30), y: node.y * ratio + 50 }

                                    } else if (length === 3) {
                                        return { ...element, x: node.x * ratioX + (80 / (length + 1) * (index + 1) - 40), y: node.y * ratio + 50 }
                                    } else {
                                        return { ...element, x: node.x * ratioX + (60 / (length + 1) * (index + 1) - 30), y: node.y * ratio + 50 }
                                    }
                                }
                                if (direction === "right") {
                                    const length = tpsOfNodesDirectional[NodeIp]["right"].length
                                    const preLength = tpsOfNodesDirectional[NodeIp]["up"].length
                                    if (length === 4) {
                                        return { ...element, y: node.y * ratio - (index * 20 - 30), x: node.x * ratioX + 50 }

                                    } else if (length === 3) {
                                        return { ...element, y: node.y * ratio - (80 / (length + 1) * (index + 1) - 40), x: node.x * ratioX + 50 }
                                    } else {
                                        return { ...element, y: node.y * ratio - (60 / (length + 1) * (index + 1) - 30), x: node.x * ratioX + 50 }
                                    }

                                }
                                if (direction === "down") {
                                    const length = tpsOfNodesDirectional[NodeIp]["down"].length
                                    const preLength = tpsOfNodesDirectional[NodeIp]["right"].length
                                    if (length === 4) {
                                        return { ...element, x: node.x * ratioX - (index * 20 - 30), y: node.y * ratio - 50 }

                                    } else if (length === 3) {
                                        return { ...element, x: node.x * ratioX - (80 / (length + 1) * (index + 1) - 40), y: node.y * ratio - 50 }
                                    } else {
                                        return { ...element, x: node.x * ratioX - (60 / (length + 1) * (index + 1) - 30), y: node.y * ratio - 50 }
                                    }

                                }
                                if (direction === "left") {
                                    const length = tpsOfNodesDirectional[NodeIp]["left"].length
                                    const preLength = tpsOfNodesDirectional[NodeIp]["down"].length
                                    if (length === 4) {
                                        return { ...element, y: node.y * ratio + (index * 20 - 30), x: node.x * ratioX - 50 }

                                    } else if (length === 3) {
                                        return { ...element, y: node.y * ratio + (80 / (length + 1) * (index + 1) - 40), x: node.x * ratioX - 50 }
                                    } else {
                                        return { ...element, y: node.y * ratio + (60 / (length + 1) * (index + 1) - 30), x: node.x * ratioX - 50 }
                                    }

                                }




                            } else {

                                const node = Nodes.find((n) => "WDM" + n.id === element.id);
                                const x = node.x * ratioX
                                const y = node.y * ratio
                                return { ...element, x: x, y: y }
                            }

                        }
                    })
                    nodesWithPosition.push({ id: "WDMLabelA", label: "", shape: "dot", size: 0, color: '#000000', x: -200, y: 130 })
                    nodesWithPosition.push({ id: "WDMLabelB", label: "", shape: "dot", size: 0, color: '#000000', x: 200, y: 130 })
                    edges.push({
                        id: "WDMLabel",
                        from: "WDMLabelA", to: "WDMLabelB", font: {
                            size: 18,
                            color: 'black',
                            bold: true
                        }, label: WDMNetworkName, color: 'rgba(0,0,0,0)'
                    })




                    simulationOtn.on("end", () => {
                        // Clamp node positions within canvas bounds
                        NodesOtn.forEach(node => {
                            node.x = Math.max(canvasBoundsOtn.x[0], Math.min(canvasBoundsOtn.x[1], node.x)); // Clamp x
                            node.y = Math.max(canvasBoundsOtn.y[0], Math.min(canvasBoundsOtn.y[1], node.y)); // Clamp y
                        });
                        const nodeToTpsMap = nodes.reduce((map, item) => {
                            if (item.id.includes("OTN") && item.group === "port") {
                                // Extract the node ID from the TP ID (e.g., "L34.4.4.5-to_HL5-2-2" → "L34.4.4.5")
                                const firstHyphen = item.id.indexOf('-');

                                const nodeId = item.id.substring(3, firstHyphen);
                                const tpId = item.id.substring(firstHyphen + 1);
                                if (!map[nodeId]) map[nodeId] = [];
                                map[nodeId].push(tpId);
                            }
                            return map;
                        }, {});
                        console.log("OTNNodeToTpsMap", nodeToTpsMap)
                        const nodesInDirectionMapOtn = categorizeNodesByDirectionClockwise(nodeWithLinkedNodesMapOtn, NodesOtn)
                        const tpsOfNodesDirectionalOtn = generateTpsOfNodesDirectional(nodesInDirectionMapOtn, linkWithDualAndUniOtn, nodeToTpsMap)
                        setNodeWithLinkedNodesMapGlobalOtn(nodeWithLinkedNodesMapOtn)
                        setLinkWithDualAndUniGlobalOtn(linkWithDualAndUniOtn)


                        console.log("nodesInDirectionOtn", nodesInDirectionMapOtn)
                        console.log("linkWithDualAndUniOtn", linkWithDualAndUniOtn)
                        console.log("tpsOfNodesDirectionalOtn", tpsOfNodesDirectionalOtn)
                        const nodesWithPositionOtn = nodes.map(element => {
                            const ratio = 1.5
                            const ratioX = 3.3
                            const yCentra = -120
                            if (element.id.includes("OTN")) {
                                if (element.id.includes('-')) {
                                    const [nodeId, tpId] = element.id.split('-');
                                    const node = NodesOtn.find((n) => "OTN" + n.id === nodeId);
                                    const NodeIp = node.id
                                    const result = findTpIdDirectionAndIndex(tpsOfNodesDirectionalOtn, NodeIp, tpId)
                                    const direction = result.direction
                                    const index = result.index
                                    if (direction === "up") {
                                        const length = tpsOfNodesDirectionalOtn[NodeIp]["up"].length
                                        const preLength = tpsOfNodesDirectionalOtn[NodeIp]["left"].length
                                        if (length === 4) {
                                            return { ...element, x: node.x * ratioX + (index * 20 - 30), y: yCentra + (node.y - yCentra) * ratio + 50 }

                                        } else if (length === 3) {
                                            return { ...element, x: node.x * ratioX + (80 / (length + 1) * (index + 1) - 40), y: yCentra + (node.y - yCentra) * ratio + 50 }
                                        } else {
                                            return { ...element, x: node.x * ratioX + (60 / (length + 1) * (index + 1) - 30), y: yCentra + (node.y - yCentra) * ratio + 50 }
                                        }
                                    }
                                    if (direction === "right") {
                                        const length = tpsOfNodesDirectionalOtn[NodeIp]["right"].length
                                        const preLength = tpsOfNodesDirectionalOtn[NodeIp]["up"].length
                                        if (length === 4) {
                                            return { ...element, y: yCentra + (node.y - yCentra) * ratio - (index * 20 - 30), x: node.x * ratioX + 50 }

                                        } else if (length === 3) {
                                            return { ...element, y: yCentra + (node.y - yCentra) * ratio - (80 / (length + 1) * (index + 1) - 40), x: node.x * ratioX + 50 }
                                        } else {
                                            return { ...element, y: yCentra + (node.y - yCentra) * ratio - (60 / (length + 1) * (index + 1) - 30), x: node.x * ratioX + 50 }
                                        }

                                    }
                                    if (direction === "down") {
                                        const length = tpsOfNodesDirectionalOtn[NodeIp]["down"].length
                                        const preLength = tpsOfNodesDirectionalOtn[NodeIp]["right"].length
                                        if (length === 4) {
                                            return { ...element, x: node.x * ratioX - (index * 20 - 30), y: yCentra + (node.y - yCentra) * ratio - 50 }

                                        } else if (length === 3) {
                                            return { ...element, x: node.x * ratioX - (80 / (length + 1) * (index + 1) - 40), y: yCentra + (node.y - yCentra) * ratio - 50 }
                                        } else {
                                            return { ...element, x: node.x * ratioX - (60 / (length + 1) * (index + 1) - 30), y: yCentra + (node.y - yCentra) * ratio - 50 }
                                        }

                                    }
                                    if (direction === "left") {
                                        const length = tpsOfNodesDirectionalOtn[NodeIp]["left"].length
                                        const preLength = tpsOfNodesDirectionalOtn[NodeIp]["down"].length
                                        if (length === 4) {
                                            return { ...element, y: yCentra + (node.y - yCentra) * ratio + (index * 20 - 30), x: node.x * ratioX - 50 }

                                        } else if (length === 3) {
                                            return { ...element, y: yCentra + (node.y - yCentra) * ratio + (80 / (length + 1) * (index + 1) - 40), x: node.x * ratioX - 50 }
                                        } else {
                                            return { ...element, y: yCentra + (node.y - yCentra) * ratio + (60 / (length + 1) * (index + 1) - 30), x: node.x * ratioX - 50 }
                                        }

                                    }




                                } else {

                                    const node = NodesOtn.find((n) => "OTN" + n.id === element.id);
                                    const x = node.x * ratioX
                                    const y = yCentra + (node.y - yCentra) * ratio
                                    return { ...element, x: x, y: y }
                                }

                            }

                        })
                        nodesWithPositionOtn.push({ id: "OTNLabelA", label: "", shape: "dot", size: 0, color: '#000000', x: -200, y: -370 })
                        nodesWithPositionOtn.push({ id: "OTNLabelB", label: "", shape: "dot", size: 0, color: '#000000', x: 200, y: -370 })
                        edges.push({
                            id: "OTNLabel",
                            from: "OTNLabelA", to: "OTNLabelB", font: {
                                size: 18,
                                color: 'black',
                                bold: true
                            }, label: OTNNetworkName, color: 'rgba(0,0,0,0)'
                        })
                        const graph = { nodes: nodesWithPosition.concat(nodesWithPositionOtn).filter((node) => node !== undefined), edges: edges }
                        setGraph(graph)
                        setUnderlayPathMap(underlayPathMap)
                        setUnderlayBackupPathMap(underlayBackupPathMap)
                        setLinkLabelName(LinklabelList)
                        setNodeLabelName(NodelabelList)
                        setOTNLabelTooltip(OTNLabelToolTipJson)
                        setWDMLabelTooltip(WDMLabelToolTipJson)
                        console.log("graph", graph)
                        console.log(underlayPathMap)
                    });
                });
            }







        }
    }

    useEffect(() => {
        getGraph()

    }, [updateState])
    return (
        <div>
            <Dashboard setOpen={setUploadFileDiagramOpen} updateState={updateState} setUpdateState={setUpdateState} />

            {data ? (
                <Graph
                    key={uuid()}
                    graph={graph}
                    options={options}
                    getNetwork={(network) => { networkRef.current = network }}
                />
            ) : (
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    textAlign: 'center'
                }}>
                    <h2>No Data Available</h2>
                    <p>Please upload a JSON file to visualize the graph</p>
                    <ThemeProvider theme={theme}>
                        <Button
                            variant="contained"
                            color="primary"
                            onClick={() => setUploadFileDiagramOpen(true)}
                            style={{ marginTop: '20px' }}
                            sx={{
                                height: 30,
                                padding: '0 12px', // Adjust horizontal padding
                                lineHeight: '1.2',
                                my: 0, color: 'white', display: 'block', fontFamily: "Times New Roman", backgroundColor: "#455a64", mr: 0, ':hover': {
                                    bgcolor: '#37474f', // theme.palette.primary.main
                                    color: '#ffffff',
                                }
                            }}
                        >
                            Upload JSON File
                        </Button>
                    </ThemeProvider>

                </div>
            )}


            <div ref={tooltipRef} className="custom-tooltip" style={{ display: 'none', position: 'absolute', background: 'white', padding: '5px', border: '1px solid black' }} />

            {modalIsOpen && (<JsonWindow open={modalIsOpen} setOpen={setIsOpen} title={modalTitle} message={selectedEdge} />)}
            {uploadFileDiagramOpen && (<UploadFileDialog open={uploadFileDiagramOpen} setOpen={setUploadFileDiagramOpen} updateState={updateState} setUpdateState={setUpdateState} />)}


        </div>
    )

}
