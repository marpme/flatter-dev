import { NextApiResponse } from 'next'
import { decryptImage } from '../../../../lib/image/crypto'
import {compressImage} from "../../../../lib/image/compression";

export const config = {
    api: {
        responseLimit: '3mb',
    },
}

const cacheMap = new Map()

export default async (req, res: NextApiResponse) => {
    if (!req.query.path) {
        res.status(404).send(null)
    }

    res.setHeader('Cache-Control', 's-maxage=86400');

    try {
        const imageToLoad = decryptImage(req.query.path)
        if(cacheMap.has(imageToLoad)) {
            const {imageType, imageContent} = cacheMap.get(imageToLoad)
            res.status(200)
                .setHeader('Content-Type', imageType)
                .send(imageContent)
            return
        }

        const imageResponse = await fetch(imageToLoad)
        const imageType = await imageResponse.headers.get('Content-Type')
        const imageContent = await compressImage(await imageResponse.arrayBuffer())

        cacheMap.set(imageToLoad, { imageType, imageContent })
        res.status(200)
            .setHeader('Content-Type', imageType)
            .send(imageContent)
    } catch (e) {
        console.error(e)
        res.status(500).send(null)
    }
}
