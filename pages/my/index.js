const app = getApp()
const wxpay = require('../../utils/pay.js')
const CONFIG = require('../../config.js')
const WXAPI = require('../../wxapi/main')
Page({
  data: {
    balance: 0.00,
    freeze: 0,
    score: 0,
    score_sign_continuous: 0,
    // 
    // getApp().globalData.my_index_flag 展示什么类型的页面。
    // -2-默认，(全部订单))
    // -1 已关闭 
    // 0 待支付 
    // 1 已支付待发货
    // 2 已发货待确认
    // 3 确认收货待评价
    // 4 已评价
    page_flag: -2 
  },
  onLoad() {
    this.page_flag = getApp().globalData.my_index_flag;
    console.log(getApp().globalData.my_index_flag)
    console.log(this.page_flag)
    this.setData({
      page_flag: this.page_flag
    })
  },
  onPullDownRefresh() {
    var that = this;
    that.setData({
      balance: 0.00,
      freeze: 0,
      score: 0,
      score_sign_continuous: 0,
      page_flag: that.page_flag
    })
    this.onLoad()
    this.onShow()
  },
  onShow() {
    const token = wx.getStorageSync('token');
    // console.log(page_flag);
    
    if (!token) {
      app.goLoginPageTimeOut()
      return
    }
    WXAPI.checkToken(token).then(function(res) {
      if (res.code != 0) {
        wx.removeStorageSync('token')
        app.goLoginPageTimeOut()
      }
    })
    wx.checkSession({
      fail() {
        app.goLoginPageTimeOut()
      }
    })
    this.getUserAmount()
    this.orderList()
  },  
  /**
 * 生命周期函数--监听页面隐藏
 */
  onHide: function () {
    console.log("hide")
  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload: function () {
    console.log("onUnload")
  },
  getUserAmount: function() {
    var that = this;
    WXAPI.userAmount(wx.getStorageSync('token')).then(function(res) {
      if (res.code == 0) {
        that.setData({
          balance: res.data.balance.toFixed(2),
          freeze: res.data.freeze.toFixed(2),
          score: res.data.score
        });
      }
    })
  },
  orderList(){
    WXAPI.orderList({
      token: wx.getStorageSync('token')
    }).then(res => {
      console.log(res)
      if (res.code === 0) {
        res.data.orderList.forEach(ele => {
          ele.dingdanhao = ele.orderNumber.substring(ele.orderNumber.length -4)
        })
        this.setData({
          orderList: res.data.orderList,
          logisticsMap: res.data.logisticsMap,
          goodsMap: res.data.goodsMap
        });
      }
    })
  },
  cancelOrder(e){
    //把订单取消掉
    console.log(e)
    const orderId = e.currentTarget.dataset.id;
    WXAPI.cancelOrder(orderId, wx.getStorageSync('token')).then(res => {
      console.log(res)
      if (res.code == 0) {
        wx.startPullDownRefresh()
        wx.stopPullDownRefresh()
        // onShow()
      }
    })
  },
  toPayTap: function (e) {
    const that = this;
    const orderId = e.currentTarget.dataset.id;
    let money = e.currentTarget.dataset.money;
    WXAPI.userAmount(wx.getStorageSync('token')).then(function (res) {
      if (res.code == 0) {
        let _msg = '订单金额: ' + money + ' 元'
        if (res.data.balance > 0) {
          _msg += ',可用余额为 ' + res.data.balance + ' 元'
          if (money - res.data.balance > 0) {
            _msg += ',仍需微信支付 ' + (money - res.data.balance) + ' 元'
          }
        }
        money = money - res.data.balance
        wx.showModal({
          title: '请确认支付',
          content: _msg,
          confirmText: "确认支付",
          cancelText: "取消支付",
          success: function (res) {
            console.log(res);
            if (res.confirm) {
              that._toPayTap(orderId, money)
            } else {
              console.log('用户点击取消支付')
              cancelOrder(orderId)
              

            }
          }
        });
      } else {
        wx.showModal({
          title: '错误',
          content: '无法获取用户资金信息',
          showCancel: false
        })
      }
    })
  },
  _toPayTap: function (orderId, money) {
    const _this = this
    if (money <= 0) {
      // 直接使用余额支付
      WXAPI.orderPay(orderId, wx.getStorageSync('token')).then(function (res) {
        _this.onShow();
      })
    } else {
      wxpay.wxpay('order', money, orderId, "/pages/order-list/index");
    }
  }
})