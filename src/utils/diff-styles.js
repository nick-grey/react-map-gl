/* @flow */

// Copyright (c) 2015 Uber Technologies, Inc.

// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:

// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

import type { MapStyle, SourcesDiff, LayersDiff } from '../types';

export function diffSources(prevStyle: MapStyle, nextStyle: MapStyle): SourcesDiff {
  const prevSources = prevStyle.get('sources');
  const nextSources = nextStyle.get('sources');
  const enter = [];
  const update = [];
  const exit = [];
  const prevIds = prevSources.keySeq().toArray();
  const nextIds = nextSources.keySeq().toArray();
  prevIds.forEach((id) => {
    const nextSource = nextSources.get(id);
    if (nextSource) {
      if (!nextSource.equals(prevSources.get(id))) {
        update.push({ id, source: nextSources.get(id) });
      }
    } else {
      exit.push({ id, source: prevSources.get(id) });
    }
  });
  nextIds.forEach((id) => {
    const prevSource = prevSources.get(id);
    if (!prevSource) {
      enter.push({ id, source: nextSources.get(id) });
    }
  });
  return { enter, update, exit };
}

export function diffLayers(prevStyle: MapStyle, nextStyle: MapStyle): LayersDiff {
  const prevLayers = prevStyle.get('layers');
  const nextLayers = nextStyle.get('layers');
  const updates = [];
  const exiting = [];
  const prevMap = {};
  const nextMap = {};
  nextLayers.forEach((layer, index) => {
    const id = layer.get('id');
    const layerImBehind = nextLayers.get(index + 1);
    nextMap[id] = {
      layer,
      id,
      // The `id` of the layer before this one.
      before: layerImBehind ? layerImBehind.get('id') : null,
      enter: true
    };
  });
  prevLayers.forEach((layer, index) => {
    const id = layer.get('id');
    const layerImBehind = prevLayers.get(index + 1);
    prevMap[id] = {
      layer,
      id,
      before: layerImBehind ? layerImBehind.get('id') : null
    };
    if (nextMap[id]) {
      // Not a new layer.
      nextMap[id].enter = false;
    } else {
      // This layer is being removed.
      exiting.push(prevMap[id]);
    }
  });
  nextLayers.reverse().forEach((layer) => {
    const id = layer.get('id');
    if (
      !prevMap[id] ||
      !prevMap[id].layer.equals(nextMap[id].layer) ||
      prevMap[id].before !== nextMap[id].before
    ) {
      // This layer is being changed.
      updates.push(nextMap[id]);
    }
  });
  return { updates, exiting };
}

export default function diffStyle(prevStyle: MapStyle, nextStyle: MapStyle) {
  return {
    sourcesDiff: diffSources(prevStyle, nextStyle),
    layersDiff: diffLayers(prevStyle, nextStyle)
  };
}
