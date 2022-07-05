import React, { useState } from "react"
import { Size } from "../types"

type GridProps = {
  grid?: boolean | { size: number }
  componentSize: Size
}

export const Grid: React.FC<GridProps> = (props) => {
  const [gridSize, setGridSize] = useState<Size>(undefined)

  let dy = 18
  let dx = 18

  if (props.grid !== null && typeof props.grid === "object") {
    dx = props.grid.size || 18
    dy = props.grid.size || 18
  }

  const { width, height } = props.componentSize

  const draw = (element: HTMLCanvasElement) => {
    if (element === null) return

    if (gridSize !== undefined && gridSize.height === height && gridSize.width === width) return

    setGridSize({ height, width })
    const ctx = element.getContext("2d")
    ctx.clearRect(0, 0, element.width, element.height)
    ctx.beginPath()
    ctx.strokeStyle = "#f2f2f2"
    for (let iy = 0; iy < height / dy; ++iy) {
      const y = dy * (iy + 0.5)
      ctx.moveTo(0, y)
      ctx.lineTo(width, y)
    }

    for (let ix = 0; ix < width / dx; ++ix) {
      const x = dx * (ix + 0.5)
      ctx.moveTo(x, 0)
      ctx.lineTo(x, height)
    }
    ctx.stroke()
  }

  return <canvas className="grid" width={width} height={height} ref={draw} />
}
