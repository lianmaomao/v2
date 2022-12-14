import { useEffect, useState } from 'react';
import { isAddress, useERC20, useFace, usePool } from '../../hooks/useContract';
import { useWeb3React } from '@web3-react/core';
import axios from "axios";
import { ethers } from "ethers"
import { Button, Col, Row, Statistic, Modal, Input, message, Rate } from 'antd';
import { formatString, fromValue, toValue, verify } from '../../utils/formatting';
import BigNumber from "bignumber.js";
import { MAX_UNIT256 } from '../../constants';
import { AddressZero } from '@ethersproject/constants'
import { iconCode, iconExchange, iconRecharge, iconRecharge1, iconScanCode } from '../../image';
import copy from 'copy-to-clipboard'
import QRCode from 'qrcode.react';
import './index.css';
import loadingStore from '../../state';
const tp = require('tp-js-sdk')

declare const window: Window & { ethereum: any, web3: any };

const TOKENADDR = process.env.REACT_APP_TOKEN + "";
const USDTADDR = process.env.REACT_APP_TOKEN_USDT + "";
const CONTRACTADDR = process.env.REACT_APP_CONTRACT + "";
const PRICEURL = "https://open.exchangerate-api.com/v6/latest";
export default function Home({ }) {
    const { ethereum } = window as any
    const { account, library } = useWeb3React();
    const tokenContract = useERC20(TOKENADDR);
    const usdtContract = useERC20(USDTADDR);
    const faceContract = useFace(CONTRACTADDR);
    const poolContract = usePool(TOKENADDR);

    const [isApprove, setIsApprove] = useState<boolean>(false);
    const [isUsdtApprove, setIsUsdtApprove] = useState<boolean>(false);
    const [balance0, setBalance0] = useState<string>('0');
    const [balance1, setBalance1] = useState<string>('0');
    const [totalAmount, setTotalAmount] = useState<string>('0');
    const [returnedAmount, setReturnedAmount] = useState<string>('0');
    const [inviteProfit, setInviteProfit] = useState<string>('0');
    const [vip, setVip] = useState<string>('0');
    const [vipProfit, setVipProfit] = useState<string>('0');

    const [score, setScore] = useState<string>('0');
    const [maxScore, setMaxScore] = useState<string>('0');
    const [selfScore, setSelfScore] = useState<string>('0');
    const [inviter, setInviter] = useState<string>('');
    const [isInviter, setIsInviter] = useState<boolean>(false);
    const [userAddr, setUserAddr] = useState<string>('');
    const [rechargeAmount, setRechargeAmount] = useState<string>('');
    const [rechargeModal, setRechargeModal] = useState<boolean>(false);
    const [codeModal, setCodeModal] = useState<boolean>(false);

    const [buyModal, setBuyModal] = useState<boolean>(false);
    const [buyAmount, setBuyAmount] = useState<string>('');

    const [sellModal, setSellModal] = useState<boolean>(false);
    const [sellAmount, setSellAmount] = useState<string>('');

    const [price, setPrice] = useState<string>('');

    // useEffect(() => {
    //     getAccounts()
    // })

    // const getAccounts = async () => {
    //     if (typeof ethereum !== 'undefined') {
    //         // connects to MetaMask
    //         const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
    //     } else {
    //         // tell the user to install an `ethereum` provider extension
    //     }
    // }

    useEffect(() => {
        getAllowance()
        init();
    })

    const getPrice = () => {
        axios.get(PRICEURL)
            .then(function (response: any) {
                if (response && response.data.rates.CNY) {
                    setPrice(response.data.rates.CNY)
                } else {
                    setPrice("")
                }
            })
            .catch(function (error) {
                setPrice("")
            })
    }

    const init = () => {
        getUsers();
        getBalanceOf();
        getPrice()
    }

    const getAllowance = () => {
        tokenContract?.allowance(account, CONTRACTADDR).then((res: any) => {
            // console.log("getAllowance", res.toString())
            if (res.toString() == "0") {
                setIsApprove(false)
            } else {
                setIsApprove(true)
            }
        }).catch((err: any) => {
            setIsApprove(false)
            console.log("getAllowance0 err", err)
        })

        usdtContract?.allowance(account, TOKENADDR).then((res: any) => {
            // console.log("getAllowance", res.toString())
            if (res.toString() == "0") {
                setIsUsdtApprove(false)
            } else {
                setIsUsdtApprove(true)
            }
        }).catch((err: any) => {
            setIsUsdtApprove(false)
            console.log("getAllowance1 err", err)
        })
    }

    const getUsers = () => {
        faceContract?.users(account).then((res: any) => {
            // console.log("getUsers", res)
            if (res.inviter === AddressZero) {
                setIsInviter(false)
            } else {
                setInviter(res.inviter)
                setIsInviter(true)
            }

            setVip(res.vip.toString())
            setScore(res.score.toString())
            setTotalAmount(res.totalAmount.toString())
            setReturnedAmount(res.returnedAmount.toString())
            setInviteProfit(res.inviteProfit.toString())
            setVipProfit(res.vipProfit.toString())

            faceContract?.users(res.maxScoreUser).then((ret: any) => {
                // console.log("getUsers maxScoreUser", res)
                setMaxScore(ret.score.toString())
                setSelfScore(ret.selfScore.toString())
            }).catch((err: any) => {
                console.log("getUsers maxScoreUser", err)
            })

        }).catch((err: any) => {
            console.log("getUsers", err)
        })
    }

    const getBalanceOf = () => {
        faceContract?.balanceOf(account).then((res: any) => {
            // console.log("balanceOf", res)
            setBalance0(res[0].toString())
            setBalance1(res[1].toString())
        }).catch((err: any) => {
            console.log("balanceOf", err)
            setBalance0("0")
            setBalance1("0")
        })
    }

    const sendDeposit = () => {

        if (!isAddress(inviter) || inviter === AddressZero) {
            message.error('????????????????????????')
            return
        }

        if (!isAddress(userAddr) || userAddr === AddressZero) {
            message.error('????????????????????????')
            return
        }

        let tokenValue = toValue(new BigNumber(rechargeAmount).dividedBy(price).multipliedBy(7).toFixed());
        loadingStore.changeLoad("???????????????", true, "loading");
        faceContract?.estimateGas.deposit(inviter, userAddr, tokenValue, { from: account }).then((gas: any) => {
            faceContract?.deposit(inviter, userAddr, tokenValue, { from: account, gasLimit: gas.mul(120).div(100) })
                .then((response: any) => {
                    console.log("response", response)
                    if (response && response.hash) {
                        TransactionReceipt(response.hash, 0)
                    } else {
                        loadingStore.changeLoad("????????????", true, "error");
                    }
                }).catch((error: any) => {
                    console.log(" error=", error)
                    loadingStore.changeLoad("????????????", true, "error");
                });
        }).catch((error: any) => {
            loadingStore.changeLoad("????????????", true, "error");
            console.log("gas error=", error)
        });
    }

    const sendSettle = () => {
        loadingStore.changeLoad("???????????????", true, "loading");
        faceContract?.estimateGas.settle(account, { from: account }).then((gas: any) => {
            faceContract?.settle(account, { from: account, gasLimit: gas.mul(120).div(100) })
                .then((response: any) => {
                    console.log("response", response)
                    if (response && response.hash) {
                        TransactionReceipt(response.hash)
                    } else {
                        loadingStore.changeLoad("????????????", true, "error");
                    }
                }).catch((error: any) => {
                    console.log(" error=", error)
                    loadingStore.changeLoad("????????????", true, "error");
                });
        }).catch((error: any) => {
            loadingStore.changeLoad("????????????", true, "error");
            console.log("gas error=", error)
        });
    }

    const sendApprove = () => {
        // setApproveLoading(true);
        loadingStore.changeLoad("???????????????", true, "loading");
        tokenContract?.estimateGas.approve(CONTRACTADDR, MAX_UNIT256, { from: account }).then((gas: any) => {
            tokenContract?.approve(CONTRACTADDR, MAX_UNIT256, { from: account, gasLimit: gas.mul(110).div(100) })
                .then((response: any) => {
                    if (response && response.hash) {
                        TransactionReceipt(response.hash, 1)
                    } else {
                        loadingStore.changeLoad("????????????", true, "error");
                    }
                }).catch((error: any) => {
                    setIsApprove(false)
                    loadingStore.changeLoad("????????????", true, "error");
                });
        }).catch((error: any) => {
            loadingStore.changeLoad("????????????", true, "error");

        });
    }

    const sendUsdtApprove = () => {
        // setApproveLoading(true);
        loadingStore.changeLoad("???????????????", true, "loading");
        usdtContract?.estimateGas.approve(TOKENADDR, MAX_UNIT256, { from: account }).then((gas: any) => {
            usdtContract?.approve(TOKENADDR, MAX_UNIT256, { from: account, gasLimit: gas.mul(110).div(100) })
                .then((response: any) => {
                    if (response && response.hash) {
                        TransactionReceipt(response.hash, 2)
                    } else {
                        loadingStore.changeLoad("????????????", true, "error");
                    }
                }).catch((error: any) => {
                    setIsApprove(false)
                    loadingStore.changeLoad("????????????", true, "error");

                });
        }).catch((error: any) => {
            loadingStore.changeLoad("????????????", true, "error");
        });
    }


    const sendBuy = () => {

        let tokenValue = toValue(buyAmount);

        if (new BigNumber(tokenValue).isZero()) {
            message.error('?????????????????????')
            return
        }
        loadingStore.changeLoad("???????????????", true, "loading");
        poolContract?.estimateGas.mint(tokenValue, { from: account }).then((gas: any) => {
            poolContract?.mint(tokenValue, { from: account, gasLimit: gas.mul(120).div(100) })
                .then((response: any) => {
                    if (response && response.hash) {
                        TransactionReceipt(response.hash, 3)
                    } else {
                        loadingStore.changeLoad("????????????", true, "error");
                    }
                }).catch((error: any) => {
                    loadingStore.changeLoad("????????????", true, "error");
                });
        }).catch((error: any) => {
            loadingStore.changeLoad("????????????", true, "error");
        });
    }

    const sendSell = () => {
        let tokenValue = toValue(sellAmount);
        if (new BigNumber(tokenValue).isZero()) {
            message.error('?????????????????????')
            return
        }
        loadingStore.changeLoad("???????????????", true, "loading");
        poolContract?.estimateGas.burn(tokenValue, { from: account }).then((gas: any) => {
            poolContract?.burn(tokenValue, { from: account, gasLimit: gas.mul(120).div(100) })
                .then((response: any) => {
                    if (response && response.hash) {
                        TransactionReceipt(response.hash, 4)
                    } else {
                        loadingStore.changeLoad("????????????", true, "error");
                    }
                }).catch((error: any) => {
                    loadingStore.changeLoad("????????????", true, "error");
                });
        }).catch((error: any) => {
            loadingStore.changeLoad("????????????", true, "error");
        });
    }

    const TransactionReceipt = (hash: any, type?: number) => {
        var interval = setInterval(() => {
            let provider = new ethers.providers.Web3Provider(library.provider);
            provider.getTransactionReceipt(hash).then((receipt: any) => {
                if (receipt != null) {
                    clearInterval(interval);
                    setTimeout(() => {
                        if (type == 0) {
                            loadingStore.changeLoad("????????????", true, "success");
                            closeModal()
                            init()
                        } else if (type == 1) {
                            loadingStore.changeLoad("????????????", true, "success");
                            setIsApprove(true)
                        } else if (type == 2) {
                            loadingStore.changeLoad("????????????", true, "success");
                            setIsUsdtApprove(true)
                        } else if (type == 3) {
                            loadingStore.changeLoad("????????????", true, "success");
                            init()
                            closeBuyModal()
                        } else if (type == 4) {
                            loadingStore.changeLoad("????????????", true, "success");
                            init()
                            closeSellModal()
                        } else {
                            loadingStore.changeLoad("????????????", true, "success");
                            init()
                        }
                    }, 1000);
                }
            });
        }, 3000);
    }

    const closeModal = () => {
        setUserAddr("");
        setRechargeAmount('');
        setRechargeModal(false);
    }

    const closeBuyModal = () => {
        setBuyAmount('');
        setBuyModal(false);
    }

    const closeSellModal = () => {
        setSellAmount('');
        setSellModal(false);
    }

    const connectWallet = () => {
        window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: process.env.REACT_APP_NET_CHAIN_ID + "" }] })
            .then(() => {
                if (window.ethereum) {
                    console.log("switch chain", process.env.REACT_APP_NET_CHAIN_ID, new Date());
                    window.ethereum
                    .request({ method: 'eth_requestAccounts' })
                    .then(()=>{
                        console.log('Please connect to MetaMask.');
                    })
                    .catch((error:any) => {
                      if (error.code === 4001) {
                        // EIP-1193 userRejectedRequest error
                        console.log('Please connect to MetaMask.');
                      } else {
                        console.error(error);
                      }
                    });

                } else {
                    alert('Please confirm that you have installed the Metamask wallet.');
                }
            })
            .catch((error: Error) => {
                const params = [{
                    chainId: process.env.REACT_APP_NET_CHAIN_ID,
                    chainName: process.env.REACT_APP_Net_Name,
                    nativeCurrency: {
                        name: process.env.REACT_APP_NET_SYMBOL,
                        symbol: process.env.REACT_APP_NET_SYMBOL,
                        decimals: process.env.REACT_APP_NET_DECIMALS
                    },
                    rpcUrls: [process.env.REACT_APP_NET_URL],
                    blockExplorerUrls: [process.env.REACT_APP_NET_SCAN]
                }];
                window.ethereum.request({ method: 'wallet_addEthereumChain', params })
                    .then(() => {
                        if (window.ethereum) {
                            console.log("add chain", process.env.REACT_APP_NET_CHAIN_ID)
                        } else {
                            alert('Please confirm that you have installed the Metamask wallet.');
                        }
                    }).catch((error: Error) => console.log("Error", error.message))
            })
    }

    const base64ToBlob = (urlData: any, type: any) => {
        let arr = urlData.split(',');
        let mime = arr[0].match(/:(.*?);/)[1] || type;
        let bytes = window.atob(arr[1]);
        let ab = new ArrayBuffer(bytes.length);
        let ia = new Uint8Array(ab);
        for (let i = 0; i < bytes.length; i++) {
            ia[i] = bytes.charCodeAt(i);
        }
        return new Blob([ab], {
            type: mime
        });
    }
    const clickCopyImg = async (i: any) => {
        const canvasImg: any = document.getElementById("code");
        let file = canvasImg?.toDataURL('image/jpg');
        let type = "image/png";
        let conversions = base64ToBlob(file, type);
        try {
            await navigator.clipboard.write([
                new ClipboardItem({
                    [conversions.type]: conversions
                })
            ])
            message.success('????????????')
        } catch (error) {
            message.error('??????????????????????????????')
        }
    }

    return (
        <div className='mainContent'>
            <div className=" main">
                <div className="home">
                    <div className='card card-shadow-origin' style={{
                        background: "#fff",
                        color: "#000",
                        marginTop: "20px"
                    }}>
                        <Row >
                            <Col >
                                <p style={{
                                    lineHeight: "35px",
                                    fontSize: "16px",
                                    fontWeight: "bold"
                                }}>
                                    {
                                        account ? <span>
                                            {formatString(account, 8)}

                                        </span> : <span onClick={() => {
                                            connectWallet()
                                        }}>connect wallet</span>
                                    }
                                </p>
                            </Col>
                            <Col flex={1} style={{
                                textAlign: "right"
                            }}>
                                <Modal title="???????????????"
                                    open={codeModal}
                                    onCancel={() => {
                                        setCodeModal(false)
                                    }}
                                    footer={null}
                                >
                                    <div>
                                        <Row className='textcenter'>
                                            <QRCode
                                                id='code'
                                                style={{
                                                    margin: "0 auto"
                                                }}
                                                value={account + ""}
                                                size={200}
                                                fgColor="#000000"
                                            />
                                        </Row>
                                        {/* <Row className='textcenter' style={{
                                            marginTop: "20px"
                                        }}>
                                            <Col flex={1}>
                                                <Button type="primary" onClick={() => {
                                                    clickCopyImg(account)
                                                }}>???????????????</Button>
                                            </Col>
                                        </Row> */}
                                    </div>
                                </Modal>

                                <img src={iconCode} alt="" onClick={() => {
                                    setCodeModal(true)
                                }} />
                            </Col>
                        </Row>
                        <Row className='texthight'>
                            <Col flex={"50px"}>??????:</Col>
                            <Col>
                                <Statistic valueStyle={{
                                    color: '#f28703',
                                    fontSize: "22px",
                                    fontWeight: "400"
                                }} value={fromValue(balance0)} precision={2} />
                            </Col>
                            <Col flex={"20px"} style={{
                                textAlign: "center"
                            }}>+</Col>
                            <Col >
                                <Statistic valueStyle={{
                                    color: '#f28703',
                                    fontSize: "22px",
                                    fontWeight: "400"
                                }} value={fromValue(balance1)} precision={2} suffix="KTA" />
                            </Col>
                        </Row>
                        <Row className='textcenter'>
                            <Col flex={"1"} style={{
                                textAlign: "center",
                                paddingBottom: "10px",
                            }}>
                                <Rate disabled defaultValue={Number(vip)} value={Number(vip)} />
                            </Col>
                        </Row>
                        <Row className='textcenter'>
                            <Modal title="??????"
                                open={rechargeModal}
                                onCancel={() => {
                                    closeModal()
                                }}
                                footer={null}
                            >
                                <div>
                                    <Row className='texthight'>
                                        <Col span={24}>
                                            <p>????????????:</p>
                                        </Col>
                                        <Col flex={"auto"}>
                                            {
                                                isInviter ? <Input value={inviter} disabled /> : <div style={{
                                                    display: "flex"
                                                }}>
                                                    <Input value={inviter} onChange={(e) => {
                                                        setInviter(e.target.value)
                                                    }} />

                                                    <img src={iconScanCode} onClick={() => {
                                                        tp.invokeQRScanner().then((res: any) => {
                                                            setInviter(res)
                                                        })
                                                    }} alt="" />
                                                </div>
                                            }
                                        </Col>
                                    </Row>

                                    <Row className='texthight'>
                                        <Col span={24}>
                                            <p>????????????:</p>
                                        </Col>
                                        <Col flex={"auto"}>

                                            <div style={{
                                                display: "flex"
                                            }}>
                                                <Input value={userAddr} onChange={(e) => {
                                                    setUserAddr(e.target.value)
                                                }} />

                                                <img src={iconScanCode} onClick={() => {
                                                    tp.invokeQRScanner().then((res: any) => {
                                                        setUserAddr(res)
                                                    })
                                                }} alt="" />
                                            </div>

                                        </Col>
                                    </Row>
                                    <Row className='texthight'>
                                        <Col span={24}>
                                            <p>????????????:</p>
                                        </Col>
                                        <Col flex={"auto"}>
                                            <Input value={rechargeAmount} onChange={(e) => {
                                                let value = e.target.value;
                                                setRechargeAmount(verify(value));
                                            }} />
                                        </Col>
                                        <Col span={24}>
                                            {
                                                price && rechargeAmount && <div style={{
                                                    display: "flex", textAlign: "right"
                                                }}>
                                                    <p style={{
                                                        flex: "1"
                                                    }}>&nbsp;</p>
                                                    <p style={{
                                                        textAlign: "right"
                                                    }}> ????????????:
                                                    </p>
                                                    <Statistic valueStyle={{
                                                        color: '#f28703',
                                                        fontSize: "14px",
                                                        fontWeight: "400",
                                                        lineHeight: "38px"
                                                    }} value={new BigNumber(rechargeAmount).dividedBy(price).multipliedBy(7).toString()} precision={2} suffix="KTA" />
                                                </div>
                                            }
                                        </Col>
                                    </Row>

                                    <Row className='textcenter' style={{
                                        marginTop: "10px"
                                    }}>
                                        <Col flex={1}>
                                            <Button type="primary" onClick={() => {
                                                closeModal()
                                            }}>??????</Button>
                                        </Col>
                                        <Col flex={1}>
                                            {
                                                isApprove ? <Button type="primary" onClick={() => {
                                                    sendDeposit()
                                                }}>??????</Button> : <Button type="primary" onClick={() => {
                                                    sendApprove()
                                                }}>??????</Button>
                                            }
                                        </Col>
                                    </Row>
                                </div>
                            </Modal>

                            <Col flex={1}>
                                <Button type="primary" onClick={() => {
                                    setRechargeModal(true);
                                }}>??????</Button>
                            </Col>
                            <Col flex={1}>
                                {

                                    new BigNumber(balance0).plus(balance1).isGreaterThan(0) ? <Button type="primary" onClick={() => {
                                        sendSettle()
                                    }}>??????</Button> : <Button type="primary" disabled>??????</Button>
                                }
                            </Col>
                        </Row>
                    </div>

                    <div className='card card-shadow-gray '>
                        <Row>
                            <Col span={24} className='card-box'>
                                <img src={iconExchange} alt="" />
                                <p>
                                    ??????
                                </p>
                            </Col>
                        </Row>
                        <Row className='textcenter'>


                            <Col flex={1}>
                                <Modal title="??????"
                                    open={buyModal}
                                    onCancel={() => {
                                        closeBuyModal()
                                    }}
                                    footer={null}
                                >
                                    <div>
                                        <Row className='texthight'>
                                            <Col>
                                                <p>????????????:</p>
                                            </Col>
                                            <Col flex={"auto"}>
                                                <Input value={buyAmount} onChange={(e) => {
                                                    let value = e.target.value;
                                                    setBuyAmount(verify(value));
                                                }} suffix={"KTA"} />
                                            </Col>
                                        </Row>

                                        <Row className='textcenter' style={{
                                            marginTop: "10px"
                                        }}>
                                            <Col flex={1}>
                                                <Button type="primary" onClick={() => {
                                                    closeBuyModal()
                                                }}>??????</Button>
                                            </Col>
                                            <Col flex={1}>
                                                {
                                                    isUsdtApprove ? <Button type="primary" onClick={() => {
                                                        sendBuy()
                                                    }}>??????</Button> : <Button type="primary" onClick={() => {
                                                        sendUsdtApprove()
                                                    }}>??????</Button>
                                                }
                                            </Col>
                                        </Row>
                                    </div>
                                </Modal>
                                <Button type="primary" onClick={() => {
                                    setBuyModal(true);
                                }}>??????</Button>
                            </Col>
                            <Col flex={1}>
                                <Modal title="??????"
                                    open={sellModal}
                                    onCancel={() => {
                                        closeSellModal()
                                    }}
                                    footer={null}
                                >
                                    <div>
                                        <Row className='texthight'>
                                            <Col>
                                                <p>????????????:</p>
                                            </Col>
                                            <Col flex={"auto"}>
                                                <Input value={sellAmount} onChange={(e) => {
                                                    let value = e.target.value;
                                                    setSellAmount(verify(value));
                                                }} suffix={"KTA"} />
                                            </Col>
                                        </Row>

                                        <Row className='textcenter' style={{
                                            marginTop: "10px"
                                        }}>
                                            <Col flex={1}>
                                                <Button type="primary" onClick={() => {
                                                    closeSellModal()
                                                }}>??????</Button>
                                            </Col>
                                            <Col flex={1}>
                                                <Button type="primary" onClick={() => {
                                                    sendSell()
                                                }}>??????</Button>
                                            </Col>
                                        </Row>
                                    </div>
                                </Modal>
                                <Button type="primary" onClick={() => {
                                    setSellModal(true);
                                }}>??????</Button>
                            </Col>
                        </Row>
                    </div>

                    <div className='card card-shadow-origin'>
                        <Row>
                            <Col span={24} className='card-box'>
                                <img src={iconRecharge1} alt="" />
                                <p>
                                    ??????
                                </p>
                            </Col>
                        </Row>
                        <Row className='textcenter'>
                            <Col flex={1}>
                                <p>?????????</p>
                                <Statistic valueStyle={{
                                    color: '#f28703',
                                    fontSize: "22px",
                                    fontWeight: "400"
                                }} value={fromValue(new BigNumber(totalAmount).dividedBy(7).toString())} precision={2} suffix="U" />
                            </Col>
                            <Col flex={1}>
                                <p>?????????</p>
                                <Statistic valueStyle={{
                                    color: '#f28703',
                                    fontSize: "22px",
                                    fontWeight: "400"
                                }} value={fromValue(new BigNumber(new BigNumber(returnedAmount).plus(balance0).toString()).dividedBy(7).toString())} precision={2} suffix="U" />

                            </Col>
                        </Row>
                        <Row className='textcenter'>
                            <Col flex={1}>
                                <p>????????????</p>
                                <Statistic valueStyle={{
                                    color: '#f28703',
                                    fontSize: "22px",
                                    fontWeight: "400"
                                }} value={fromValue(new BigNumber(new BigNumber(maxScore).plus(selfScore).toString()).toFixed())} precision={2} suffix="U" />
                            </Col>
                            <Col flex={1}>
                                <p>?????????</p>
                                <Statistic valueStyle={{
                                    color: '#f28703',
                                    fontSize: "22px",
                                    fontWeight: "400"
                                }} value={fromValue(new BigNumber(score).toFixed())} precision={2} suffix="U" />
                            </Col>
                        </Row>
                    </div>
                    <div className='card card-shadow-gray'>
                        <Row>
                            <Col span={24} className='card-box'>
                                <img src={iconRecharge} alt="" />
                                <p>
                                    ??????
                                </p>
                            </Col>
                        </Row>
                        <Row className='texthight'>
                            <Col>
                                <p>????????????:</p>
                            </Col>
                            <Col flex={"auto"}>
                                <Statistic valueStyle={{
                                    color: '#f28703',
                                    fontSize: "22px",
                                    fontWeight: "400",
                                    paddingLeft: "10px"
                                }} value={fromValue(new BigNumber(new BigNumber(returnedAmount).plus(balance0).toString()).dividedBy(7).toString())} precision={2} suffix="U" />
                            </Col>
                        </Row>
                        <Row className='texthight'>
                            <Col>
                                <p>????????????:</p>
                            </Col>
                            <Col flex={"auto"}>
                                <Statistic valueStyle={{
                                    color: '#f28703',
                                    fontSize: "22px",
                                    fontWeight: "400",
                                    paddingLeft: "10px"
                                }} value={fromValue(new BigNumber(inviteProfit).dividedBy(7).toString())} precision={2} suffix="U" />
                            </Col>
                        </Row>
                        <Row className='texthight'>
                            <Col>
                                <p>????????????:</p>
                            </Col>
                            <Col flex={"auto"}>
                                <Statistic valueStyle={{
                                    color: '#f28703',
                                    fontSize: "22px",
                                    fontWeight: "400",
                                    paddingLeft: "10px"

                                }} value={fromValue(new BigNumber(new BigNumber(vipProfit).plus(balance1).toString()).dividedBy(7).toString())} precision={2} suffix="U" />
                            </Col>
                        </Row>
                    </div>
                </div>
            </div>
        </div>
    )
}
